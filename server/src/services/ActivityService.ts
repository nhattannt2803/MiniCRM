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
  }) {
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.priority) where.priority = params.priority;
    if (params.assignedTo) where.assignedTo = BigInt(params.assignedTo);
    if (params.relatedType && params.relatedId) {
      where.relatedType = params.relatedType;
      where.relatedId = BigInt(params.relatedId);
    }

    if (params.isOverdue) {
      where.status = { in: ['TODO', 'IN_PROGRESS'] };
      where.dueAt = { lt: new Date() };
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { dueAt: 'asc' },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const now = new Date();
    return tasks.map((t) => ({
      ...t,
      id: t.id.toString(),
      assignedTo: t.assignedTo?.toString(),
      createdBy: t.createdBy?.toString(),
      relatedId: t.relatedId.toString(),
      isOverdue: t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.dueAt < now,
    }));
  }

  public static async createTask(data: any) {
    const task = await prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          title: data.title,
          description: data.description || null,
          priority: data.priority || 'MEDIUM',
          status: data.status || 'TODO',
          assignedTo: data.assignedTo ? BigInt(data.assignedTo) : null,
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
