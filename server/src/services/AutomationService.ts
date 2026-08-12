import prisma from '../config/database';
import { AppError } from '../middleware/errorMiddleware';

export class AutomationService {
  public static async getAutomations() {
    const automations = await prisma.automation.findMany({
      where: { deletedAt: null },
      orderBy: { priority: 'asc' },
      include: {
        triggers: true,
        conditions: { orderBy: { orderNo: 'asc' } },
        actions: { orderBy: { stepOrder: 'asc' } },
        _count: { select: { executions: true } },
      },
    });

    return automations.map((a) => ({
      ...a,
      id: a.id.toString(),
      createdBy: a.createdBy?.toString(),
      executionCount: a._count.executions,
      triggers: a.triggers.map((t) => ({ ...t, id: t.id.toString(), automationId: t.automationId.toString() })),
      conditions: a.conditions.map((c) => ({ ...c, id: c.id.toString(), automationId: c.automationId.toString() })),
      actions: a.actions.map((act) => ({ ...act, id: act.id.toString(), automationId: act.automationId.toString() })),
    }));
  }

  public static async getAutomationById(id: string | number) {
    const autoId = BigInt(id);
    const automation = await prisma.automation.findFirst({
      where: { id: autoId, deletedAt: null },
      include: {
        triggers: true,
        conditions: { orderBy: { orderNo: 'asc' } },
        actions: { orderBy: { stepOrder: 'asc' } },
        executions: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { executionLogs: { orderBy: { stepNo: 'asc' } } },
        },
      },
    });

    if (!automation) throw new AppError('Automation not found', 404, 'AUTOMATION_NOT_FOUND');

    return {
      ...automation,
      id: automation.id.toString(),
      triggers: automation.triggers.map((t) => ({ ...t, id: t.id.toString() })),
      conditions: automation.conditions.map((c) => ({ ...c, id: c.id.toString() })),
      actions: automation.actions.map((act) => ({ ...act, id: act.id.toString() })),
      executions: automation.executions.map((e) => ({
        ...e,
        id: e.id.toString(),
        automationId: e.automationId.toString(),
        entityId: e.entityId.toString(),
        executionLogs: e.executionLogs.map((l) => ({ ...l, id: l.id.toString() })),
      })),
    };
  }

  public static async createAutomation(data: any) {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.automation.create({
        data: {
          name: data.name,
          description: data.description || null,
          isActive: data.isActive !== undefined ? data.isActive : true,
          triggerType: data.triggerType || 'EVENT_BASED',
          priority: data.priority || 10,
          createdBy: data.userId ? BigInt(data.userId) : null,
          triggers: {
            create: data.triggers.map((t: any) => ({
              triggerEvent: t.triggerEvent,
              entityType: t.entityType,
              config: t.config ? (typeof t.config === 'string' ? t.config : JSON.stringify(t.config)) : null,
            })),
          },
          conditions: data.conditions
            ? {
                create: data.conditions.map((c: any, idx: number) => ({
                  field: c.field,
                  operator: c.operator,
                  value: c.value !== undefined ? (typeof c.value === 'string' ? c.value : JSON.stringify(c.value)) : null,
                  logicOperator: c.logicOperator || 'AND',
                  orderNo: idx + 1,
                })),
              }
            : undefined,
          actions: {
            create: data.actions.map((act: any, idx: number) => ({
              actionType: act.actionType,
              config: typeof act.config === 'string' ? act.config : JSON.stringify(act.config),
              stepOrder: idx + 1,
            })),
          },
        },
      });

      return { ...created, id: created.id.toString() };
    });
  }

  public static async toggleAutomation(id: string | number, isActive: boolean) {
    const autoId = BigInt(id);
    const updated = await prisma.automation.update({
      where: { id: autoId },
      data: { isActive },
    });
    return { ...updated, id: updated.id.toString() };
  }

  public static async getExecutions(params: { page?: number; limit?: number; status?: string }) {
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status) where.status = params.status;

    const [total, executions] = await Promise.all([
      prisma.automationExecution.count({ where }),
      prisma.automationExecution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          automation: { select: { id: true, name: true } },
          executionLogs: { orderBy: { stepNo: 'asc' } },
        },
      }),
    ]);

    return {
      data: executions.map((e) => ({
        ...e,
        id: e.id.toString(),
        automationId: e.automationId.toString(),
        entityId: e.entityId.toString(),
        executionLogs: e.executionLogs.map((l) => ({ ...l, id: l.id.toString() })),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
