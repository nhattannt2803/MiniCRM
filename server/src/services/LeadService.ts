import prisma from '../config/database';
import redisClient from '../config/redis';
import { publishOutboxEvent } from '../events/outboxPublisher';
import { AppError } from '../middleware/errorMiddleware';
import { IdentityResolutionService } from './IdentityResolutionService';
import { SystemSettingService } from './SystemSettingService';
import { parseFbPsidInput, parseZaloUidInput } from '../utils/identityHelper';

const smaxMemoryCache = new Map<string, { data: any; expiresAt: number }>();

export class LeadService {
  public static async getLeads(bizId: bigint, params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    rating?: string;
    source?: string;
    ownerId?: string | number;
    customerId?: string | number;
  }) {
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where: any = { bizId, deletedAt: null };

    if (params.status) where.status = params.status;
    if (params.rating) where.rating = params.rating;
    if (params.source) where.source = params.source;
    if (params.ownerId) where.ownerId = BigInt(params.ownerId);
    if (params.customerId) where.customerId = BigInt(params.customerId);

    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search } },
        { lastName: { contains: params.search } },
        { email: { contains: params.search } },
        { phone: { contains: params.search } },
        { companyName: { contains: params.search } },
      ];
    }

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, firstName: true, lastName: true, email: true } },
          company: { select: { id: true, name: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          customer: { select: { id: true, customerCode: true, company: true, contact: true } },
          campaign: { select: { id: true, name: true } },
          products: { include: { product: true } },
          ads: true,
        },
      }),
    ]);

    return {
      data: leads.map((l) => ({
        ...l,
        id: l.id.toString(),
        companyId: l.companyId?.toString(),
        contactId: l.contactId?.toString(),
        customerId: l.customerId?.toString(),
        campaignId: l.campaignId?.toString(),
        ownerId: l.ownerId?.toString(),
        adIds: l.ads ? l.ads.map((a) => a.adId) : [],
        products: l.products
          ? l.products.map((lp) => ({
              ...lp,
              id: lp.id.toString(),
              leadId: lp.leadId.toString(),
              productId: lp.productId.toString(),
              product: lp.product ? { ...lp.product, id: lp.product.id.toString(), unitPrice: Number(lp.product.unitPrice) } : null,
            }))
          : [],
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getLeadById(bizId: bigint, id: string | number) {
    const leadId = BigInt(id);
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, bizId, deletedAt: null },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        company: true,
        contact: true,
        customer: { include: { company: true, contact: true, identities: true } },
        campaign: true,
        convertedOpportunity: true,
        convertedCustomer: true,
        products: { include: { product: true } },
        ads: true,
        conversations: {
          orderBy: { updatedAt: 'desc' },
          include: { messages: { orderBy: { sentAt: 'desc' }, take: 1 } },
        },
      },
    });

    if (!lead) {
      throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
    }

    // Fetch activities & tasks
    const [activities, tasks] = await Promise.all([
      prisma.activity.findMany({
        where: { relatedType: 'LEAD', relatedId: leadId },
        orderBy: { createdAt: 'desc' },
        include: { owner: { select: { firstName: true, lastName: true } } },
      }),
      prisma.task.findMany({
        where: { relatedType: 'LEAD', relatedId: leadId },
        orderBy: { dueAt: 'asc' },
        include: { assignee: { select: { firstName: true, lastName: true } } },
      }),
    ]);

    const fbPsidIdentity = lead.customer?.identities?.find((i) => i.type === 'FB_PSID')?.identityValue || null;

    return {
      ...lead,
      id: lead.id.toString(),
      companyId: lead.companyId?.toString(),
      contactId: lead.contactId?.toString(),
      customerId: lead.customerId?.toString(),
      campaignId: lead.campaignId?.toString(),
      ownerId: lead.ownerId?.toString(),
      fbPsid: fbPsidIdentity,
      smaxBizSlug: lead.smaxBizSlug || null,
      adIds: lead.ads ? lead.ads.map((a) => a.adId) : [],
      customer: lead.customer
        ? {
            ...lead.customer,
            id: lead.customer.id.toString(),
            identities: lead.customer.identities.map((i) => ({ ...i, id: i.id.toString() })),
          }
        : null,
      conversations: lead.conversations.map((c) => ({
        ...c,
        id: c.id.toString(),
        customerId: c.customerId?.toString(),
        leadId: c.leadId?.toString(),
      })),
      activities: activities.map((a) => ({ ...a, id: a.id.toString() })),
      tasks: tasks.map((t) => ({ ...t, id: t.id.toString() })),
      products: lead.products
        ? lead.products.map((lp) => ({
            ...lp,
            id: lp.id.toString(),
            leadId: lp.leadId.toString(),
            productId: lp.productId.toString(),
            product: lp.product ? { ...lp.product, id: lp.product.id.toString(), unitPrice: Number(lp.product.unitPrice) } : null,
          }))
        : [],
    };
  }

  public static async createLead(bizId: bigint, data: any) {
    // 1. Identity Resolution Check
    const resolution = await IdentityResolutionService.resolveIdentity(bizId, {
      phone: data.phone,
      email: data.email,
      name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
    });

    let assignedCustomerId: bigint | null = data.customerId ? BigInt(data.customerId) : null;
    let resolutionStatus = data.identityResolutionStatus || resolution.status;

    if (!assignedCustomerId && resolution.status === 'MATCHED' && resolution.matchedCustomerId) {
      assignedCustomerId = BigInt(resolution.matchedCustomerId);
    }

    // 2. Check for active existing lead to evaluate Merge vs Create New Lead
    let activeExistingLead: any = null;
    const whereOR: any[] = [];
    if (data.phone && data.phone.trim()) whereOR.push({ phone: data.phone.trim() });
    if (data.email && data.email.trim()) whereOR.push({ email: data.email.trim() });
    if (assignedCustomerId) whereOR.push({ customerId: assignedCustomerId });

    if (whereOR.length > 0) {
      activeExistingLead = await prisma.lead.findFirst({
        where: {
          bizId,
          deletedAt: null,
          status: { notIn: ['CONVERTED', 'DISQUALIFIED'] },
          OR: whereOR,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (activeExistingLead) {
      const duplicateRule = await SystemSettingService.getLeadDuplicateRule(bizId);
      let shouldMerge = false;

      if (duplicateRule.mode === 'ALWAYS_MERGE') {
        shouldMerge = true;
      } else if (duplicateRule.mode === 'ALWAYS_NEW') {
        shouldMerge = false;
      } else {
        const stage = await prisma.pipelineStage.findFirst({
          where: { code: activeExistingLead.status, isActive: true },
        });

        if (duplicateRule.mode === 'LEVEL_1_STAGE_FLAG') {
          shouldMerge = stage ? stage.allowLeadMerge : true;
        } else if (duplicateRule.mode === 'LEVEL_2_STAGE_CATEGORY') {
          const allowedCategories = duplicateRule.openStageCategories || ['OPEN'];
          const stageCat = stage ? stage.stageCategory : 'OPEN';
          shouldMerge = allowedCategories.includes(stageCat);
        }
      }

      if (shouldMerge) {
        const rawProductIds: (string | number)[] = data.productIds || (data.productId ? [data.productId] : []);
        if (rawProductIds.length > 0) {
          for (let i = 0; i < rawProductIds.length; i++) {
            const pId = BigInt(rawProductIds[i]);
            const exists = await prisma.leadProduct.findFirst({
              where: { leadId: activeExistingLead.id, productId: pId },
            });
            if (!exists) {
              const existingCount = await prisma.leadProduct.count({ where: { leadId: activeExistingLead.id } });
              await prisma.leadProduct.create({
                data: {
                  leadId: activeExistingLead.id,
                  productId: pId,
                  isPrimary: i === 0 && existingCount === 0,
                },
              });
            }
          }
        }

        // Merge Ad IDs (accumulate new ad_ids without overwriting)
        const rawAdIds: string[] = [];
        if (Array.isArray(data.adIds)) {
          rawAdIds.push(...data.adIds.map((a: any) => String(a).trim()).filter(Boolean));
        } else if (data.adId) {
          const splitAds = String(data.adId).split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
          rawAdIds.push(...splitAds);
        }

        if (rawAdIds.length > 0) {
          const uniqueAdIds = Array.from(new Set(rawAdIds));
          for (const aId of uniqueAdIds) {
            const exists = await prisma.leadAd.findFirst({
              where: { leadId: activeExistingLead.id, adId: aId },
            });
            if (!exists) {
              await prisma.leadAd.create({
                data: {
                  leadId: activeExistingLead.id,
                  adId: aId,
                },
              });
            }
          }
        }

        if (data.notes && data.notes.trim()) {
          const dateStr = new Date().toLocaleDateString('vi-VN');
          await prisma.lead.update({
            where: { id: activeExistingLead.id },
            data: {
              notes: activeExistingLead.notes
                ? `${activeExistingLead.notes}\n[Gộp nhu cầu mới ${dateStr}]: ${data.notes}`
                : `[Gộp nhu cầu mới ${dateStr}]: ${data.notes}`,
            },
          });
        }

        return {
          ...activeExistingLead,
          id: activeExistingLead.id.toString(),
          customerId: activeExistingLead.customerId?.toString() || null,
          isMerged: true,
          mergedToLeadId: activeExistingLead.id.toString(),
          message: 'Nhu cầu sản phẩm mới đã được gộp vào Lead hiện tại theo cấu hình hệ thống.',
        };
      }
    }

    const lead = await prisma.$transaction(async (tx) => {
      // If NEW_CUSTOMER and no customerId provided, auto-create a Customer Profile
      if (!assignedCustomerId && resolutionStatus === 'NEW_CUSTOMER') {
        const contact = await tx.contact.create({
          data: {
            bizId,
            firstName: data.firstName,
            lastName: data.lastName || '',
            email: data.email || null,
            phone: data.phone || null,
            position: data.jobTitle || null,
            isCustomer: true,
            ownerId: data.ownerId ? BigInt(data.ownerId) : null,
          },
        });

        const custCode = `CUST-${Date.now().toString().slice(-6)}`;
        const customer = await tx.customer.create({
          data: {
            bizId,
            customerCode: custCode,
            entityType: 'CONTACT',
            contactId: contact.id,
            ownerId: data.ownerId ? BigInt(data.ownerId) : null,
            status: 'ACTIVE',
          },
        });

        assignedCustomerId = customer.id;
      }

      const receivedAt = data.receivedAt ? new Date(data.receivedAt) : new Date();

      const created = await tx.lead.create({
        data: {
          bizId,
          firstName: data.firstName,
          lastName: data.lastName || '',
          email: data.email || null,
          phone: data.phone || null,
          companyName: data.companyName || null,
          jobTitle: data.jobTitle || null,
          source: data.source || 'WEBSITE',
          status: data.status || 'NEW',
          rating: data.rating || 'WARM',
          identityResolutionStatus: resolutionStatus,
          notes: data.notes || null,
          companyId: data.companyId ? BigInt(data.companyId) : null,
          contactId: data.contactId ? BigInt(data.contactId) : null,
          customerId: assignedCustomerId,
          campaignId: data.campaignId ? BigInt(data.campaignId) : null,
          ownerId: data.ownerId ? BigInt(data.ownerId) : null,
          smaxBizSlug: data.smaxBizSlug || null,
          fbPageId: data.fbPageId || null,
          fbPageName: data.fbPageName || null,
          receivedAt,
        },
      });

      // Attach interested products
      const rawProductIds: (string | number)[] = data.productIds || (data.productId ? [data.productId] : []);
      if (rawProductIds.length > 0) {
        for (let i = 0; i < rawProductIds.length; i++) {
          const pId = BigInt(rawProductIds[i]);
          await tx.leadProduct.create({
            data: {
              leadId: created.id,
              productId: pId,
              isPrimary: i === 0,
            },
          });
        }
      }

      // Attach ad_ids
      const rawAdIds: string[] = [];
      if (Array.isArray(data.adIds)) {
        rawAdIds.push(...data.adIds.map((a: any) => String(a).trim()).filter(Boolean));
      } else if (data.adId) {
        const splitAds = String(data.adId).split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
        rawAdIds.push(...splitAds);
      }
      const uniqueAdIds = Array.from(new Set(rawAdIds));
      for (const aId of uniqueAdIds) {
        await tx.leadAd.create({
          data: {
            leadId: created.id,
            adId: aId,
            fbPageId: data.fbPageId || null,
            sourceType: data.source || 'FB_ADS',
          },
        });
      }

      // If customer assigned (matched or newly created), ensure identities are linked
      if (assignedCustomerId) {
        if (data.phone && data.phone.trim()) {
          await tx.customerIdentity.upsert({
            where: { customerId_type_identityValue: { customerId: assignedCustomerId, type: 'PHONE', identityValue: data.phone.trim() } },
            update: { status: 'ACTIVE' },
            create: { customerId: assignedCustomerId, type: 'PHONE', identityValue: data.phone.trim(), isVerified: true },
          });
        }
        if (data.email && data.email.trim()) {
          await tx.customerIdentity.upsert({
            where: { customerId_type_identityValue: { customerId: assignedCustomerId, type: 'EMAIL', identityValue: data.email.trim().toLowerCase() } },
            update: { status: 'ACTIVE' },
            create: { customerId: assignedCustomerId, type: 'EMAIL', identityValue: data.email.trim().toLowerCase(), isVerified: true },
          });
        }
        const cleanFb = parseFbPsidInput(data.fbPsid);
        if (cleanFb) {
          await tx.customerIdentity.upsert({
            where: { customerId_type_identityValue: { customerId: assignedCustomerId, type: 'FB_PSID', identityValue: cleanFb } },
            update: { status: 'ACTIVE' },
            create: { customerId: assignedCustomerId, type: 'FB_PSID', identityValue: cleanFb, isVerified: true },
          });
        }
        const cleanZalo = parseZaloUidInput(data.zaloUid);
        if (cleanZalo) {
          await tx.customerIdentity.upsert({
            where: { customerId_type_identityValue: { customerId: assignedCustomerId, type: 'ZALO_UID', identityValue: cleanZalo } },
            update: { status: 'ACTIVE' },
            create: { customerId: assignedCustomerId, type: 'ZALO_UID', identityValue: cleanZalo, isVerified: true },
          });
        }
      }

      // Publish Outbox Event
      await publishOutboxEvent(tx, bizId, 'LEAD_CREATED', 'LEAD', created.id, {
        id: created.id.toString(),
        first_name: created.firstName,
        last_name: created.lastName,
        email: created.email,
        source: created.source,
        status: created.status,
        owner_id: created.ownerId?.toString(),
      });

      return created;
    });

    return {
      ...lead,
      id: lead.id.toString(),
      customerId: lead.customerId?.toString() || null,
      identityResolutionResult: resolution,
    };
  }

  public static async updateLead(bizId: bigint, id: string | number, data: any) {
    const leadId = BigInt(id);
    const existing = await prisma.lead.findFirst({ where: { id: leadId, bizId, deletedAt: null } });
    if (!existing) throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.lead.update({
        where: { id: leadId },
        data: {
          firstName: data.firstName !== undefined ? data.firstName : existing.firstName,
          lastName: data.lastName !== undefined ? data.lastName : existing.lastName,
          email: data.email !== undefined ? data.email : existing.email,
          phone: data.phone !== undefined ? data.phone : existing.phone,
          companyName: data.companyName !== undefined ? data.companyName : existing.companyName,
          jobTitle: data.jobTitle !== undefined ? data.jobTitle : existing.jobTitle,
          source: data.source !== undefined ? data.source : existing.source,
          status: data.status !== undefined ? data.status : existing.status,
          rating: data.rating !== undefined ? data.rating : existing.rating,
          identityResolutionStatus: data.identityResolutionStatus !== undefined ? data.identityResolutionStatus : existing.identityResolutionStatus,
          customerId: data.customerId !== undefined ? (data.customerId ? BigInt(data.customerId) : null) : existing.customerId,
          notes: data.notes !== undefined ? data.notes : existing.notes,
          ownerId: data.ownerId !== undefined ? (data.ownerId ? BigInt(data.ownerId) : null) : existing.ownerId,
          smaxBizSlug: data.smaxBizSlug !== undefined ? data.smaxBizSlug : existing.smaxBizSlug,
          fbPageId: data.fbPageId !== undefined ? data.fbPageId : existing.fbPageId,
          fbPageName: data.fbPageName !== undefined ? data.fbPageName : existing.fbPageName,
          receivedAt: data.receivedAt !== undefined ? (data.receivedAt ? new Date(data.receivedAt) : null) : existing.receivedAt,
        },
      });

      if (data.productIds !== undefined && Array.isArray(data.productIds)) {
        await tx.leadProduct.deleteMany({ where: { leadId } });
        for (let i = 0; i < data.productIds.length; i++) {
          const pId = BigInt(data.productIds[i]);
          await tx.leadProduct.create({
            data: {
              leadId,
              productId: pId,
              isPrimary: i === 0,
            },
          });
        }
      }

      if (data.adIds !== undefined || data.adId !== undefined) {
        const rawAdIds: string[] = [];
        if (Array.isArray(data.adIds)) {
          rawAdIds.push(...data.adIds.map((a: any) => String(a).trim()).filter(Boolean));
        } else if (data.adId) {
          const splitAds = String(data.adId).split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
          rawAdIds.push(...splitAds);
        }
        const uniqueAdIds = Array.from(new Set(rawAdIds));
        await tx.leadAd.deleteMany({ where: { leadId } });
        for (const aId of uniqueAdIds) {
          await tx.leadAd.create({
            data: {
              leadId,
              adId: aId,
              fbPageId: data.fbPageId !== undefined ? data.fbPageId : res.fbPageId,
              sourceType: data.source !== undefined ? data.source : res.source,
            },
          });
        }
      }

      if (data.status && data.status !== existing.status) {
        // Publish single STATUS_CHANGED outbox event for any status transition
        await publishOutboxEvent(tx, bizId, 'STATUS_CHANGED', 'LEAD', res.id, {
          id: res.id.toString(),
          status: res.status,
          old_status: existing.status,
          owner_id: res.ownerId?.toString(),
        });
      }

      return res;
    });

    return { ...updated, id: updated.id.toString(), customerId: updated.customerId?.toString() || null };
  }

  public static async deleteLead(bizId: bigint, id: string | number) {
    const leadId = BigInt(id);
    await prisma.lead.update({
      where: { id: leadId },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  public static parseSmaxUrl(url: string) {
    if (!url) return null;

    const bizMatch = url.match(/bizs\/([^\/]+)/);
    const biz = bizMatch ? bizMatch[1] : null;

    const pageMatch = url.match(/(?:pages|chats)\/([^\/?#]+)/);
    let pageId = pageMatch ? pageMatch[1] : null;

    let threadId = null;
    const tidQueryMatch = url.match(/[?&]tid=([^&]+)/);
    if (tidQueryMatch) {
      threadId = tidQueryMatch[1];
    } else {
      const threadPathMatch = url.match(/threads\/([^\/?#]+)/);
      if (threadPathMatch) {
        threadId = threadPathMatch[1];
      }
    }

    if (!biz || !pageId || !threadId) return null;

    if (!pageId.startsWith('fb') && /^\d+$/.test(pageId)) {
      pageId = `fb${pageId}`;
    }
    if (!threadId.startsWith('fb') && /^\d+$/.test(threadId)) {
      threadId = `fb${threadId}`;
    }

    return { biz, pageId, threadId };
  }

  public static async fetchSmaxThread(
    smaxInput: string | { smaxBizSlug?: string; pageId?: string; threadId?: string },
    bizId?: bigint
  ) {
    let parsed: { biz: string; pageId: string; threadId: string } | null = null;

    if (typeof smaxInput === 'string') {
      if (!smaxInput || !smaxInput.trim()) {
        throw new AppError('Vui lòng cung cấp link hội thoại Smax.ai', 400, 'INVALID_SMAX_URL');
      }
      parsed = this.parseSmaxUrl(smaxInput.trim());
    } else if (smaxInput && typeof smaxInput === 'object') {
      const biz = (smaxInput.smaxBizSlug || '').trim();
      const rawPageId = String(smaxInput.pageId || '').trim();
      const rawThreadId = String(smaxInput.threadId || '').trim();

      const cleanPageId = rawPageId.replace(/^(?:fb|t_)+/gi, '').replace(/\D+/g, '');
      const cleanThreadId = rawThreadId.replace(/^(?:fb|t_)+/gi, '').replace(/\D+/g, '');

      if (biz && cleanPageId && cleanThreadId) {
        parsed = {
          biz,
          pageId: `fb${cleanPageId}`,
          threadId: `fb${cleanThreadId}`,
        };
      }
    }

    if (!parsed) {
      throw new AppError(
        'Thông tin hội thoại Smax.ai không hợp lệ. Ví dụ: https://smax.ai/bizs/xe-dien-move/chats/fb760420303821103?tid=fb27040617945611633 hoặc truyền bộ (pageId, threadId, smaxBizId)',
        400,
        'INVALID_SMAX_URL_FORMAT'
      );
    }

    const token = await SystemSettingService.getSmaxApiToken(bizId);
    let targetApi = `https://api.smax.ai/bizs/${parsed.biz}/pages/${parsed.pageId}/threads/${parsed.threadId}`;

    try {
      let response = await fetch(targetApi, {
        headers: {
          authorization: `Bearer ${token}`,
          'Accept-Encoding': 'gzip, deflate, br',
        },
      });

      // Fallback 1: If 404 Not Found, try swapping pageId and threadId (handles pageId_threadId vs threadId_pageId order)
      if (!response.ok && response.status === 404 && parsed.pageId && parsed.threadId && parsed.pageId !== parsed.threadId) {
        const swappedApi = `https://api.smax.ai/bizs/${parsed.biz}/pages/${parsed.threadId}/threads/${parsed.pageId}`;
        const swappedResponse = await fetch(swappedApi, {
          headers: {
            authorization: `Bearer ${token}`,
            'Accept-Encoding': 'gzip, deflate, br',
          },
        });

        if (swappedResponse.ok) {
          response = swappedResponse;
          const temp = parsed.pageId;
          parsed.pageId = parsed.threadId;
          parsed.threadId = temp;
        }
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new AppError(
            'Smax API Token không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra và cập nhật Token mới trong Cài đặt hệ thống.',
            400,
            'SMAX_TOKEN_EXPIRED'
          );
        }
        throw new AppError(`Không thể lấy dữ liệu từ Smax.ai API (Status ${response.status})`, 400, 'SMAX_API_ERROR');
      }

      const json: any = await response.json();

      if (json.code === 401 || json.status === 401 || json.error === 'Unauthorized' || json.message?.toLowerCase()?.includes('token') || json.error?.message?.toLowerCase()?.includes('token')) {
        throw new AppError(
          'Smax API Token không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra và cập nhật Token mới trong Cài đặt hệ thống.',
          400,
          'SMAX_TOKEN_EXPIRED'
        );
      }

      const customer =
        json.data?.customers?.[0] ||
        json.data?.customer ||
        json.data?.facebook ||
        json.data?.user ||
        json.data?.subscriber ||
        json.data?.sender;

      if (!customer && !json.data) {
        throw new AppError('Không tìm thấy thông tin khách hàng trong hội thoại Smax.ai', 404, 'SMAX_CUSTOMER_NOT_FOUND');
      }

      let name =
        customer?.name ||
        customer?.profile_name ||
        customer?.full_name ||
        customer?.display_name ||
        json.data?.name ||
        json.data?.title ||
        json.data?.caption ||
        json.data?.profile_name ||
        json.data?.customer_name ||
        json.data?.user_name ||
        json.data?.subscriber?.name ||
        json.data?.subscriber?.profile_name ||
        json.data?.sender?.name ||
        json.data?.sender?.profile_name ||
        json.data?.facebook?.name ||
        json.data?.facebook?.profile_name ||
        json.data?.facebook_name ||
        json.data?.user?.name ||
        '';

      if (!name && (customer?.first_name || customer?.last_name || json.data?.first_name || json.data?.last_name)) {
        const first = customer?.first_name || json.data?.first_name || '';
        const last = customer?.last_name || json.data?.last_name || '';
        name = `${last} ${first}`.trim();
      }

      // Fallback 2: If thread metadata does not contain customer name, fetch recent messages to extract sender_name
      if (!name && parsed.pageId && parsed.threadId) {
        try {
          const msgsApi = `https://api.smax.ai/bizs/${parsed.biz}/pages/${parsed.pageId}/threads/${parsed.threadId}/messages?sort=-created_at&limit=10`;
          const msgsRes = await fetch(msgsApi, {
            headers: { authorization: `Bearer ${token}`, 'Accept-Encoding': 'gzip, deflate, br' },
          });
          if (msgsRes.ok) {
            const msgsJson: any = await msgsRes.json();
            const rawMsgs = Array.isArray(msgsJson.data) ? msgsJson.data : (Array.isArray(json.data?.messages) ? json.data.messages : []);
            const cleanPid = String(parsed.pageId).replace(/^(?:fb|t_)+/gi, '').replace(/\D+/g, '');
            for (const m of rawMsgs) {
              const senderPid = String(m.sender_pid || m.from || m.by || '');
              const isPageSender = senderPid.includes(cleanPid) || m.is_page === true || m.is_bot === true || m.sender_type === 'AGENT';
              if (!isPageSender) {
                const foundSenderName = m.sender_name || m.from?.name || m.by_name || m.user_name || m.name || m.facebook?.sender_name || '';
                if (foundSenderName && typeof foundSenderName === 'string' && foundSenderName.trim()) {
                  name = foundSenderName.trim();
                  break;
                }
              }
            }
          }
        } catch (msgErr) {}
      }
      let phone = customer?.phone || customer?.phones?.[0]?.value || '';
      if (!phone && json.data?.tag_aliases) {
        const foundPhone = json.data.tag_aliases.find((t: string) => /^\d{9,11}$/.test(t));
        if (foundPhone) phone = foundPhone;
      }
      if (!phone && json.data?.last_content_by_user && /^\d{9,11}$/.test(json.data.last_content_by_user)) {
        phone = json.data.last_content_by_user;
      }

      const rawPageId = parsed.pageId || json.data?.page_pid || json.data?.page_id || json.data?.facebook?.page_id || '';
      const rawThreadId = parsed.threadId || json.data?.tid || json.data?.thread_id || '';
      const cleanPageId = String(rawPageId).replace(/^(?:fb|t_)+/gi, '').replace(/\D+/g, '');
      const cleanThreadId = String(rawThreadId).replace(/^(?:fb|t_)+/gi, '').replace(/\D+/g, '');

      let fbPsid = '';
      if (cleanPageId && cleanThreadId) {
        fbPsid = `fb${cleanPageId}_${cleanThreadId}`;
      } else if (cleanPageId) {
        fbPsid = `fb${cleanPageId}`;
      } else if (cleanThreadId) {
        fbPsid = `fb_${cleanThreadId}`;
      }

      const fbPageId = cleanPageId || customer?.facebook?.page_id || json.data?.facebook?.page_id || undefined;
      const fbPageName =
        customer?.facebook?.page_name ||
        json.data?.facebook?.page_name ||
        json.data?.page_name ||
        json.data?.page?.name ||
        undefined;

      const extractedAdIds: string[] = [];
      const addAdId = (val: any) => {
        if (!val) return;
        if (Array.isArray(val)) {
          val.forEach((item) => addAdId(item));
        } else if (typeof val === 'object') {
          if (val.ad_id || val.adId || val.id) {
            addAdId(val.ad_id || val.adId || val.id);
          }
        } else {
          const str = String(val).trim();
          if (str && !extractedAdIds.includes(str)) {
            extractedAdIds.push(str);
          }
        }
      };

      addAdId(json.data?.ad_id);
      addAdId(json.data?.adId);
      addAdId(json.data?.ad_ids);
      addAdId(json.data?.adIds);
      addAdId(json.data?.ads_id);
      addAdId(json.data?.facebook?.ad_id);
      addAdId(json.data?.facebook?.facebook?.ad_id);
      addAdId(json.data?.ad);
      addAdId(json.data?.ads);
      addAdId(json.data?.meta?.ad_id);
      addAdId(customer?.ad_id);
      addAdId(customer?.facebook?.ad_id);

      const isAdsSource =
        String(json.data?.source || '').toLowerCase().includes('ad') ||
        String(json.data?.type || '').toLowerCase().includes('ad') ||
        extractedAdIds.length > 0;

      const primaryAdId = extractedAdIds[0] || undefined;
      const source = isAdsSource ? 'FB_ADS' : 'FACEBOOK';

      return {
        name,
        phone,
        fbPsid,
        fbPageId,
        fbPageName,
        smaxBizSlug: parsed.biz,
        source,
        adId: primaryAdId,
        adIds: extractedAdIds,
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(`Lỗi kết nối tới Smax.ai: ${err.message}`, 500, 'SMAX_FETCH_ERROR');
    }
  }

  public static async fetchSmaxMessages(
    smaxUrlOrPsid: string,
    bizId?: bigint,
    forceRefresh: boolean = false,
    inputBizSlug?: string
  ) {
    if (!smaxUrlOrPsid || !smaxUrlOrPsid.trim()) {
      throw new AppError('Vui lòng cung cấp link hội thoại Smax.ai hoặc PSID', 400, 'INVALID_SMAX_URL');
    }

    let smaxBizSlug = inputBizSlug || '';
    let pageId = '';
    let threadId = '';
    let fullSmaxUrl = smaxUrlOrPsid.trim();

    if (fullSmaxUrl.includes('smax.ai') || fullSmaxUrl.startsWith('http://') || fullSmaxUrl.startsWith('https://')) {
      const parsed = this.parseSmaxUrl(fullSmaxUrl);
      if (!parsed) {
        throw new AppError('Link hội thoại Smax.ai không hợp lệ', 400, 'INVALID_SMAX_URL_FORMAT');
      }
      smaxBizSlug = parsed.biz;
      pageId = parsed.pageId;
      threadId = parsed.threadId;
    } else {
      // PSID input, e.g. "fb760420303821103_28029744610001629"
      const cleanedPsid = parseFbPsidInput(fullSmaxUrl);
      if (!cleanedPsid || !cleanedPsid.includes('_')) {
        throw new AppError('Mã PSID không hợp lệ (ví dụ: fb760420303821103_28029744610001629)', 400, 'INVALID_PSID_FORMAT');
      }
      const parts = cleanedPsid.replace(/^fb/, '').split('_');
      pageId = `fb${parts[0]}`;
      threadId = `fb${parts[1]}`;

      if (!smaxBizSlug && bizId) {
        const bizObj = await prisma.business.findUnique({ where: { id: bizId }, select: { slug: true } });
        if (bizObj?.slug) smaxBizSlug = bizObj.slug;
      }

      fullSmaxUrl = `https://smax.ai/bizs/${smaxBizSlug}/chats/${pageId}?tid=${threadId}`;
    }

    const cleanPageId = pageId.replace(/^(?:fb|t_)+/gi, '').replace(/\D+/g, '');
    const cleanThreadId = threadId.replace(/^(?:fb|t_)+/gi, '').replace(/\D+/g, '');
    const cacheKey = `smax_messages:${smaxBizSlug}:${cleanPageId}:${cleanThreadId}`;

    // 1. Check Cache if not forcing refresh
    if (!forceRefresh) {
      try {
        const cachedStr = await redisClient.get(cacheKey);
        if (cachedStr) {
          const cachedJson = JSON.parse(cachedStr);
          return { ...cachedJson, fromCache: true };
        }
      } catch (redisErr) {}

      const mem = smaxMemoryCache.get(cacheKey);
      if (mem && mem.expiresAt > Date.now()) {
        return { ...mem.data, fromCache: true };
      }
    }

    // 2. Fetch from Smax APIs
    const token = await SystemSettingService.getSmaxApiToken(bizId);
    const threadApi = `https://api.smax.ai/bizs/${smaxBizSlug}/pages/${pageId}/threads/${threadId}`;
    const messagesApi = `https://api.smax.ai/bizs/${smaxBizSlug}/pages/${pageId}/threads/${threadId}/messages?sort=-created_at&limit=25`;

    try {
      const [threadRes, msgsRes] = await Promise.all([
        fetch(threadApi, { headers: { authorization: `Bearer ${token}`, 'Accept-Encoding': 'gzip, deflate, br' } }),
        fetch(messagesApi, { headers: { authorization: `Bearer ${token}`, 'Accept-Encoding': 'gzip, deflate, br' } }),
      ]);

      if (!threadRes.ok && !msgsRes.ok) {
        if (threadRes.status === 401 || msgsRes.status === 401 || threadRes.status === 403 || msgsRes.status === 403) {
          throw new AppError(
            'Smax API Token không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra và cập nhật Token mới trong Cài đặt hệ thống.',
            400,
            'SMAX_TOKEN_EXPIRED'
          );
        }
        throw new AppError(`Không thể lấy dữ liệu từ Smax.ai API`, 400, 'SMAX_API_ERROR');
      }

      let threadJson: any = {};
      if (threadRes.ok) {
        threadJson = await threadRes.json();
      }

      let msgsJson: any = {};
      if (msgsRes.ok) {
        msgsJson = await msgsRes.json();
      }

      const customerObj = threadJson.data?.customer || threadJson.data?.customers?.[0] || threadJson.data?.facebook;
      const customerName = customerObj?.name || customerObj?.profile_name || threadJson.data?.facebook?.name || 'Khách hàng';
      let phone = customerObj?.phone || customerObj?.phones?.[0] || threadJson.data?.phones?.[0] || '';
      if (!phone && threadJson.data?.tag_aliases) {
        const foundPhone = threadJson.data.tag_aliases.find((t: string) => /^\d{9,11}$/.test(t));
        if (foundPhone) phone = foundPhone;
      }

      const fbPsid = `fb${cleanPageId}_${cleanThreadId}`;

      let rawMsgs: any[] = [];
      if (Array.isArray(msgsJson.data)) {
        rawMsgs = msgsJson.data;
      } else if (Array.isArray(threadJson.data?.messages)) {
        rawMsgs = threadJson.data.messages;
      }

      let formattedMessages: any[] = rawMsgs
        .map((m: any, idx: number) => {
          const content = m.message || m.text || m.content || m.facebook?.message || (m.facebook?.attachments?.length ? '[File/Hình ảnh đính kèm]' : '');
          const senderPid = String(m.sender_pid || m.from || m.by || '');
          const isPageSender = senderPid.includes(cleanPageId) || m.is_page === true || m.is_bot === true || m.sender_type === 'AGENT';
          const isCustomerSender = !isPageSender;

          let senderType: 'CUSTOMER' | 'AGENT' | 'SYSTEM' = 'SYSTEM';
          let senderName = 'Hệ thống';

          if (isCustomerSender) {
            senderType = 'CUSTOMER';
            senderName = customerName;
          } else {
            senderType = 'AGENT';
            senderName = m.page_name || 'Tư vấn viên (Smax.ai)';
          }

          const rawTime = m.created_at || m.createdAt || m.time || m._created_at;
          let sentAt = new Date().toISOString();
          if (rawTime) {
            try {
              const num = Number(rawTime);
              sentAt = new Date(!isNaN(num) && num < 10000000000 ? num * 1000 : rawTime).toISOString();
            } catch (e) {}
          }

          return {
            id: String(m.id || m._id || m.pid || `msg_${idx}`),
            content: content || '—',
            senderType,
            senderName,
            sentAt,
            attachments: m.facebook?.attachments || m.attachments || undefined,
          };
        })
        .reverse();

      if (formattedMessages.length === 0) {
        if (customerObj?.last_content_by_user || threadJson.data?.last_content_by_user) {
          formattedMessages.push({
            id: 'last_user_msg',
            content: customerObj?.last_content_by_user || threadJson.data?.last_content_by_user,
            senderType: 'CUSTOMER',
            senderName: customerName,
            sentAt: customerObj?.last_message_by_customer_at || new Date().toISOString(),
          });
        }
        if (customerObj?.last_content_by_page || threadJson.data?.last_content_by_page) {
          formattedMessages.push({
            id: 'last_page_msg',
            content: customerObj?.last_content_by_page || threadJson.data?.last_content_by_page,
            senderType: 'AGENT',
            senderName: 'Tư vấn viên (Smax.ai)',
            sentAt: customerObj?.last_message_at || new Date().toISOString(),
          });
        }
      }

      const cachedAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      const result = {
        customerInfo: {
          name: customerName,
          phone,
          fbPsid,
          smaxBizSlug,
          smaxUrl: fullSmaxUrl,
        },
        messages: formattedMessages,
        cachedAt,
        expiresAt,
        fromCache: false,
      };

      try {
        await redisClient.set(cacheKey, JSON.stringify(result), 'EX', 900);
      } catch (redisErr) {}

      smaxMemoryCache.set(cacheKey, {
        data: result,
        expiresAt: Date.now() + 15 * 60 * 1000,
      });

      return result;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(`Lỗi kết nối tới Smax.ai API: ${err.message}`, 500, 'SMAX_FETCH_ERROR');
    }
  }
}
