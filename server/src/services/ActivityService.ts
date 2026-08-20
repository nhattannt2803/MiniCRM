import prisma from '../config/database';
import { publishOutboxEvent } from '../events/outboxPublisher';
import { AppError } from '../middleware/errorMiddleware';

export class ActivityService {
  public static async getActivities(bizId: bigint, params: {
    relatedType?: string;
    relatedId?: string | number;
    ownerId?: string | number;
  }) {
    const where: any = { bizId };
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

  public static async createActivity(bizId: bigint, data: any) {
    const activity = await prisma.$transaction(async (tx) => {
      const created = await tx.activity.create({
        data: {
          bizId,
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

      await publishOutboxEvent(tx, bizId, 'ACTIVITY_CREATED', data.relatedType, data.relatedId, {
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
  public static async getTasks(bizId: bigint, params: {
    status?: string;
    priority?: string;
    assignedTo?: string | number;
    relatedType?: string;
    relatedId?: string | number;
    isOverdue?: boolean;
    preset?: string;
    limit?: string | number;
  }) {
    const where: any = { bizId };
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
            where: { bizId, id: { in: leadIds } },
            select: { id: true, firstName: true, lastName: true, companyName: true },
          })
        : [],
      customerIds.length > 0
        ? prisma.customer.findMany({
            where: { bizId, id: { in: customerIds } },
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

  public static async createTask(bizId: bigint, data: any) {
    const task = await prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          bizId,
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

      await publishOutboxEvent(tx, bizId, 'TASK_CREATED', data.relatedType, data.relatedId, {
        task_id: created.id.toString(),
        title: created.title,
        priority: created.priority,
        assigned_to: created.assignedTo?.toString(),
      });

      return created;
    });

    return { ...task, id: task.id.toString() };
  }

  private static getCallFollowUpDueAt(hoursToAdd: number, from = new Date()) {
    const dueAt = new Date(from.getTime() + hoursToAdd * 60 * 60 * 1000);
    const hour = dueAt.getHours();
    const minute = dueAt.getMinutes();

    // 20:00–23:39: move to 09:00 next day; 00:00–06:59: move to 09:00 that day.
    if (hour >= 20 && (hour < 23 || minute <= 39)) {
      dueAt.setDate(dueAt.getDate() + 1);
      dueAt.setHours(9, 0, 0, 0);
    } else if (hour < 7) {
      dueAt.setHours(9, 0, 0, 0);
    }

    return dueAt;
  }

  public static async updateTaskStatus(bizId: bigint, id: string | number, status: string, result?: string) {
    const taskId = BigInt(id);
    const existing = await prisma.task.findFirst({ where: { id: taskId, bizId } });
    if (!existing) throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');

    if (existing.status === 'COMPLETED' && status === 'COMPLETED') {
      return {
        ...existing,
        id: existing.id.toString(),
        assignedTo: existing.assignedTo?.toString(),
        createdBy: existing.createdBy?.toString(),
        relatedId: existing.relatedId?.toString(),
      };
    }

    const normalizedResult = result?.trim().toUpperCase();
    const isCallTask = /^Gọi (lại )?khách hàng/i.test(existing.title.trim()) || /^Gọi /i.test(existing.title.trim());
    const isCallResult = ['BUSY', 'UNREACHABLE', 'WRONG_NUMBER'].includes(normalizedResult || '');
    if (status === 'COMPLETED' && isCallTask && !isCallResult) {
      throw new AppError('Vui lòng chọn kết quả cuộc gọi trước khi xác nhận hoàn thành', 400, 'CALL_RESULT_REQUIRED');
    }

    const completedAt = status === 'COMPLETED' ? new Date() : null;
    const updated = await prisma.$transaction(async (tx) => {
      const freshTask = await tx.task.findFirst({ where: { id: taskId, bizId } });
      if (!freshTask) throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
      if (freshTask.status === 'COMPLETED' && status === 'COMPLETED') {
        return freshTask;
      }

      const completed = await tx.task.update({
        where: { id: taskId },
        data: { status, completedAt },
      });

      if (status === 'COMPLETED' && isCallTask) {
        const attemptMatch = existing.title.match(/Lần (\d)$/);
        const attempt = attemptMatch ? Number(attemptMatch[1]) : 1;
        const customer = await tx.customer.findFirst({
          where: { id: existing.relatedId, bizId },
          include: { company: { select: { name: true } }, contact: { select: { firstName: true, lastName: true } } },
        });
        const customerName = customer?.company?.name || (customer?.contact ? `${customer.contact.lastName} ${customer.contact.firstName}`.trim() : `#${existing.relatedId}`);

        if ((normalizedResult === 'BUSY' || normalizedResult === 'UNREACHABLE') && attempt < 3) {
          const nextAttempt = attempt + 1;
          const nextTitle = `Gọi lại khách hàng - Lần ${nextAttempt}`;
          const existingNextTask = await tx.task.findFirst({
            where: {
              bizId,
              relatedType: 'CUSTOMER',
              relatedId: existing.relatedId,
              title: nextTitle,
            },
          });

          if (!existingNextTask) {
            const dueAt = this.getCallFollowUpDueAt(nextAttempt === 2 ? 0.5 : 2, completedAt!);
            await tx.task.create({
              data: {
                bizId,
                title: nextTitle,
                description: `Tự động tạo sau cuộc gọi lần ${attempt}: ${normalizedResult === 'BUSY' ? 'Máy bận' : 'Không liên lạc được'}.`,
                priority: 'HIGH',
                status: 'TODO',
                assignedTo: existing.assignedTo,
                createdBy: existing.createdBy,
                dueAt,
                relatedType: 'CUSTOMER',
                relatedId: existing.relatedId,
              },
            });
          }
        }

        if (normalizedResult === 'WRONG_NUMBER') {
          const verifyTitle = 'Hỏi xác thực người';
          const existingVerifyTask = await tx.task.findFirst({
            where: {
              bizId,
              relatedType: 'CUSTOMER',
              relatedId: existing.relatedId,
              title: verifyTitle,
            },
          });

          if (!existingVerifyTask) {
            await tx.task.create({
              data: {
                bizId,
                title: verifyTitle,
                description: `Xác thực lại thông tin liên hệ cho khách hàng ${customerName} do số điện thoại sai.`,
                priority: 'HIGH',
                status: 'TODO',
                assignedTo: existing.assignedTo,
                createdBy: existing.createdBy,
                dueAt: this.getCallFollowUpDueAt(2, completedAt!),
                relatedType: 'CUSTOMER',
                relatedId: existing.relatedId,
              },
            });
          }

          if (existing.assignedTo) {
            const existingNotif = await tx.notification.findFirst({
              where: {
                bizId,
                userId: existing.assignedTo,
                type: 'WRONG_CUSTOMER_PHONE',
                entityType: 'CUSTOMER',
                entityId: existing.relatedId,
              },
            });

            if (!existingNotif) {
              await tx.notification.create({
                data: {
                  bizId,
                  userId: existing.assignedTo,
                  type: 'WRONG_CUSTOMER_PHONE',
                  title: 'Số điện thoại khách hàng không chính xác',
                  message: `Khách hàng ${customerName} được báo số điện thoại sai. Vui lòng xác thực lại người liên hệ.`,
                  entityType: 'CUSTOMER',
                  entityId: existing.relatedId,
                },
              });
            }
          }
        }
      }

      await publishOutboxEvent(tx, bizId, 'TASK_COMPLETED', 'TASK', taskId, {
        task_id: completed.id.toString(),
        title: completed.title,
        assigned_to: completed.assignedTo?.toString() || null,
        completed_at: completedAt?.toISOString() || null,
        result: normalizedResult || null,
      });
      return completed;
    });

    return { ...updated, id: updated.id.toString() };
  }

  public static async updateTask(bizId: bigint, id: string | number, data: any) {
    const taskId = BigInt(id);
    const existing = await prisma.task.findFirst({ where: { id: taskId, bizId } });
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
  public static async getCampaigns(bizId: bigint) {
    const campaigns = await prisma.campaign.findMany({
      where: { bizId, deletedAt: null },
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
