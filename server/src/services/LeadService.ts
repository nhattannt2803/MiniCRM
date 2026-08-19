import prisma from '../config/database';
import { publishOutboxEvent } from '../events/outboxPublisher';
import { AppError } from '../middleware/errorMiddleware';
import { IdentityResolutionService } from './IdentityResolutionService';
import { SystemSettingService } from './SystemSettingService';
import { parseFbPsidInput, parseZaloUidInput } from '../utils/identityHelper';

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

    return {
      ...lead,
      id: lead.id.toString(),
      companyId: lead.companyId?.toString(),
      contactId: lead.contactId?.toString(),
      customerId: lead.customerId?.toString(),
      campaignId: lead.campaignId?.toString(),
      ownerId: lead.ownerId?.toString(),
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

  public static async fetchSmaxThread(smaxUrl: string, bizId?: bigint) {
    if (!smaxUrl || !smaxUrl.trim()) {
      throw new AppError('Vui lòng cung cấp link hội thoại Smax.ai', 400, 'INVALID_SMAX_URL');
    }

    const parsed = this.parseSmaxUrl(smaxUrl.trim());
    if (!parsed) {
      throw new AppError(
        'Link hội thoại Smax.ai không hợp lệ. Ví dụ: https://smax.ai/bizs/xe-dien-move/chats/fb760420303821103?tid=fb27040617945611633',
        400,
        'INVALID_SMAX_URL_FORMAT'
      );
    }

    const targetApi = `https://api.smax.ai/bizs/${parsed.biz}/pages/${parsed.pageId}/threads/${parsed.threadId}`;
    const token = await SystemSettingService.getSmaxApiToken(bizId);

    try {
      const response = await fetch(targetApi, {
        headers: {
          authorization: `Bearer ${token}`,
          'Accept-Encoding': 'gzip, deflate, br',
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new AppError(
            'Smax API Token không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra và cập nhật Token mới trong Cài đặt hệ thống.',
            401,
            'SMAX_TOKEN_EXPIRED'
          );
        }
        throw new AppError(`Không thể lấy dữ liệu từ Smax.ai API (Status ${response.status})`, 400, 'SMAX_API_ERROR');
      }

      const json: any = await response.json();

      if (json.code === 401 || json.status === 401 || json.error === 'Unauthorized' || json.message?.toLowerCase()?.includes('token') || json.error?.message?.toLowerCase()?.includes('token')) {
        throw new AppError(
          'Smax API Token không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra và cập nhật Token mới trong Cài đặt hệ thống.',
          401,
          'SMAX_TOKEN_EXPIRED'
        );
      }

      const customer = json.data?.customers?.[0] || json.data?.customer || json.data?.facebook;

      if (!customer && !json.data) {
        throw new AppError('Không tìm thấy thông tin khách hàng trong hội thoại Smax.ai', 404, 'SMAX_CUSTOMER_NOT_FOUND');
      }

      const name = customer?.name || customer?.profile_name || json.data?.facebook?.name || '';
      let phone = customer?.phone || customer?.phones?.[0]?.value || '';
      if (!phone && json.data?.tag_aliases) {
        const foundPhone = json.data.tag_aliases.find((t: string) => /^\d{9,11}$/.test(t));
        if (foundPhone) phone = foundPhone;
      }
      if (!phone && json.data?.last_content_by_user && /^\d{9,11}$/.test(json.data.last_content_by_user)) {
        phone = json.data.last_content_by_user;
      }

      const rawPageId = json.data?.facebook?.page_id || parsed.pageId || '';
      const rawThreadId = json.data?.facebook?.id || parsed.threadId || '';
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

      return {
        name,
        phone,
        fbPsid,
        source: 'FACEBOOK',
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(`Lỗi kết nối tới Smax.ai: ${err.message}`, 500, 'SMAX_FETCH_ERROR');
    }
  }
}
