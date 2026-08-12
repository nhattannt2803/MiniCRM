import prisma from '../config/database';
import { publishOutboxEvent } from '../events/outboxPublisher';
import { AppError } from '../middleware/errorMiddleware';

export class LeadService {
  public static async getLeads(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    rating?: string;
    source?: string;
    ownerId?: string | number;
  }) {
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (params.status) where.status = params.status;
    if (params.rating) where.rating = params.rating;
    if (params.source) where.source = params.source;
    if (params.ownerId) where.ownerId = BigInt(params.ownerId);

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
          campaign: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      data: leads.map((l) => ({
        ...l,
        id: l.id.toString(),
        companyId: l.companyId?.toString(),
        contactId: l.contactId?.toString(),
        campaignId: l.campaignId?.toString(),
        ownerId: l.ownerId?.toString(),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getLeadById(id: string | number) {
    const leadId = BigInt(id);
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, deletedAt: null },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        company: true,
        contact: true,
        campaign: true,
        convertedOpportunity: true,
        convertedCustomer: true,
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
      campaignId: lead.campaignId?.toString(),
      ownerId: lead.ownerId?.toString(),
      activities: activities.map((a) => ({ ...a, id: a.id.toString() })),
      tasks: tasks.map((t) => ({ ...t, id: t.id.toString() })),
    };
  }

  public static async createLead(data: any) {
    const lead = await prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email || null,
          phone: data.phone || null,
          companyName: data.companyName || null,
          jobTitle: data.jobTitle || null,
          source: data.source || 'WEBSITE',
          status: data.status || 'NEW',
          rating: data.rating || 'WARM',
          notes: data.notes || null,
          companyId: data.companyId ? BigInt(data.companyId) : null,
          contactId: data.contactId ? BigInt(data.contactId) : null,
          campaignId: data.campaignId ? BigInt(data.campaignId) : null,
          ownerId: data.ownerId ? BigInt(data.ownerId) : null,
        },
      });

      // Publish Outbox Event
      await publishOutboxEvent(tx, 'LEAD_CREATED', 'LEAD', created.id, {
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

    return { ...lead, id: lead.id.toString() };
  }

  public static async updateLead(id: string | number, data: any) {
    const leadId = BigInt(id);
    const existing = await prisma.lead.findFirst({ where: { id: leadId, deletedAt: null } });
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
          notes: data.notes !== undefined ? data.notes : existing.notes,
          ownerId: data.ownerId !== undefined ? (data.ownerId ? BigInt(data.ownerId) : null) : existing.ownerId,
        },
      });

      if (data.status && data.status !== existing.status) {
        const eventType = data.status === 'QUALIFIED' ? 'LEAD_QUALIFIED' : 'LEAD_UPDATED';
        await publishOutboxEvent(tx, eventType, 'LEAD', res.id, {
          id: res.id.toString(),
          status: res.status,
          old_status: existing.status,
          owner_id: res.ownerId?.toString(),
        });
      }

      return res;
    });

    return { ...updated, id: updated.id.toString() };
  }

  public static async deleteLead(id: string | number) {
    const leadId = BigInt(id);
    await prisma.lead.update({
      where: { id: leadId },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }
}
