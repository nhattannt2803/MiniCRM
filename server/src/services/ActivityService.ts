import prisma from '../config/database';
import { publishOutboxEvent } from '../events/outboxPublisher';
import { AppError } from '../middleware/errorMiddleware';

export class ActivityService {
  public static async getActivities(params: {
    relatedType?: string;
    relatedId?: string | number;
    ownerId?: string | number;
  }) {
    const where: any = {};
    if (params.relatedType && params.relatedId) {
      where.relatedType = params.relatedType;
      where.relatedId = BigInt(params.relatedId);
    }
    if (params.ownerId) where.ownerId = BigInt(params.ownerId);

    const activities = await prisma.activity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return activities.map((a) => ({
      ...a,
      id: a.id.toString(),
      ownerId: a.ownerId?.toString(),
      createdBy: a.createdBy?.toString(),
      relatedId: a.relatedId.toString(),
    }));
  }

  public static async createActivity(data: any) {
    const activity = await prisma.$transaction(async (tx) => {
      const created = await tx.activity.create({
        data: {
          type: data.type || 'NOTE',
          subject: data.subject,
          description: data.description || null,
          status: data.status || 'COMPLETED',
          ownerId: data.ownerId ? BigInt(data.ownerId) : null,
          createdBy: data.userId ? BigInt(data.userId) : null,
          dueAt: data.dueAt ? new Date(data.dueAt) : null,
          completedAt: data.status === 'COMPLETED' ? new Date() : null,
          relatedType: data.relatedType,
          relatedId: BigInt(data.relatedId),
        },
      });

      await publishOutboxEvent(tx, 'ACTIVITY_CREATED', data.relatedType, data.relatedId, {
        activity_id: created.id.toString(),
        type: created.type,
        subject: created.subject,
        owner_id: created.ownerId?.toString(),
      });

      return created;
    });

    return { ...activity, id: activity.id.toString() };
  }
}

export class TaskService {
  public static async getTasks(params: {
    status?: string;
    priority?: string;
    assignedTo?: string | number;
    relatedType?: string;
    relatedId?: string | number;
    isOverdue?: boolean;
    preset?: string;
    limit?: string | number;
  }) {
    const where: any = {};
    if (params.status) {
      if (typeof params.status === 'string' && params.status.includes(',')) {
        where.status = { in: params.status.split(',').map((s) => s.trim()) };
      } else if (Array.isArray(params.status)) {
        where.status = { in: params.status };
      } else {
        where.status = params.status;
      }
    }
    if (params.priority) where.priority = params.priority;
    if (params.assignedTo) where.assignedTo = BigInt(params.assignedTo);
    if (params.relatedType && params.relatedId) {
      where.relatedType = params.relatedType;
      where.relatedId = BigInt(params.relatedId);
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const endOfNext2Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 23, 59, 59, 999);

    if (params.preset === 'OVERDUE_TODAY') {
      const statusCondition = where.status || { in: ['TODO', 'IN_PROGRESS'] };
      delete where.status;
      where.OR = [
        {
          status: statusCondition,
          dueAt: { lt: startOfToday },
        },
        {
          status: statusCondition,
          dueAt: { gte: startOfToday, lte: endOfToday },
        },
      ];
    } else if (params.preset === 'OVERDUE') {
      if (!params.status) {
        where.status = { in: ['TODO', 'IN_PROGRESS'] };
      }
      where.dueAt = { lt: now };
    } else if (params.preset === 'TODAY') {
      where.dueAt = { gte: startOfToday, lte: endOfToday };
    } else if (params.preset === 'NEXT_2_DAYS') {
      where.dueAt = { gte: startOfToday, lte: endOfNext2Days };
    } else if (params.isOverdue === true || String(params.isOverdue) === 'true') {
      if (!params.status) {
        where.status = { in: ['TODO', 'IN_PROGRESS'] };
      }
      where.dueAt = { lt: now };
    }

    let take: number | undefined;
    if (params.limit && params.limit !== 'all' && params.limit !== 'unlimited') {
      take = Number(params.limit);
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { dueAt: 'asc' },
      ...(take ? { take } : {}),
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const leadIds = tasks.filter((t) => t.relatedType === 'LEAD').map((t) => t.relatedId);
    const customerIds = tasks.filter((t) => t.relatedType === 'CUSTOMER').map((t) => t.relatedId);

    const [leads, customers] = await Promise.all([
      leadIds.length > 0
        ? prisma.lead.findMany({
            where: { id: { in: leadIds } },
            select: { id: true, firstName: true, lastName: true, companyName: true },
          })
        : [],
      customerIds.length > 0
        ? prisma.customer.findMany({
            where: { id: { in: customerIds } },
            include: { company: { select: { name: true } }, contact: { select: { firstName: true, lastName: true } } },
          })
        : [],
    ]);

    const leadMap = new Map(leads.map((l) => [l.id.toString(), l]));
    const customerMap = new Map(customers.map((c) => [c.id.toString(), c]));

    return tasks.map((t) => {
      let relatedInfo: any = null;
      if (t.relatedType === 'LEAD') {
        const lead = leadMap.get(t.relatedId.toString());
        if (lead) {
          relatedInfo = {
            type: 'LEAD',
            id: lead.id.toString(),
            name: `${lead.lastName} ${lead.firstName}`.trim(),
            company: lead.companyName || null,
          };
        }
      } else if (t.relatedType === 'CUSTOMER') {
        const cust = customerMap.get(t.relatedId.toString());
        if (cust) {
          const name = cust.company?.name || (cust.contact ? `${cust.contact.lastName} ${cust.contact.firstName}`.trim() : cust.customerCode);
          relatedInfo = {
            type: 'CUSTOMER',
            id: cust.id.toString(),
            name,
            code: cust.customerCode,
          };
        }
      }

      return {
        ...t,
        id: t.id.toString(),
        assignedTo: t.assignedTo?.toString(),
        createdBy: t.createdBy?.toString(),
        relatedId: t.relatedId.toString(),
        relatedInfo,
        isOverdue: t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.dueAt < now,
      };
    });
  }

  public static async createTask(data: any) {
    const task = await prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          title: data.title,
          description: data.description || null,
          priority: data.priority || 'MEDIUM',
          status: data.status || 'TODO',
          assignedTo: data.assignedTo ? BigInt(data.assignedTo) : (data.userId ? BigInt(data.userId) : null),
          createdBy: data.userId ? BigInt(data.userId) : null,
          dueAt: new Date(data.dueAt),
          relatedType: data.relatedType,
          relatedId: BigInt(data.relatedId),
        },
      });

      await publishOutboxEvent(tx, 'TASK_CREATED', data.relatedType, data.relatedId, {
        task_id: created.id.toString(),
        title: created.title,
        priority: created.priority,
        assigned_to: created.assignedTo?.toString(),
      });

      return created;
    });

    return { ...task, id: task.id.toString() };
  }

  public static async updateTaskStatus(id: string | number, status: string) {
    const taskId = BigInt(id);
    const completedAt = status === 'COMPLETED' ? new Date() : null;

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { status, completedAt },
    });

    return { ...updated, id: updated.id.toString() };
  }

  public static async updateTask(id: string | number, data: any) {
    const taskId = BigInt(id);
    const existing = await prisma.task.findFirst({ where: { id: taskId } });
    if (!existing) throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');

    const status = data.status !== undefined ? data.status : existing.status;
    const completedAt = status === 'COMPLETED' ? (existing.completedAt || new Date()) : null;

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: data.title !== undefined ? data.title : existing.title,
        description: data.description !== undefined ? data.description : existing.description,
        priority: data.priority !== undefined ? data.priority : existing.priority,
        status,
        completedAt,
        assignedTo: data.assignedTo !== undefined ? (data.assignedTo ? BigInt(data.assignedTo) : null) : existing.assignedTo,
        dueAt: data.dueAt ? new Date(data.dueAt) : existing.dueAt,
      },
    });

    return {
      ...updated,
      id: updated.id.toString(),
      assignedTo: updated.assignedTo?.toString(),
      createdBy: updated.createdBy?.toString(),
      relatedId: updated.relatedId.toString(),
    };
  }
}

export class CampaignService {
  public static async getCampaigns() {
    const campaigns = await prisma.campaign.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { leads: true, opportunities: true } },
      },
    });

    return campaigns.map((c) => ({
      ...c,
      id: c.id.toString(),
      budget: Number(c.budget),
      actualCost: Number(c.actualCost),
      expectedRevenue: Number(c.expectedRevenue),
      leadCount: c._count.leads,
      opportunityCount: c._count.opportunities,
    }));
  }
}
