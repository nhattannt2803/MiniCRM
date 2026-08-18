import prisma from '../config/database';
import { AppError } from '../middleware/errorMiddleware';

export class AutomationService {
  public static async getAutomations(bizId: bigint) {
    const automations = await prisma.automation.findMany({
      where: { bizId, deletedAt: null },
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

  public static async getAutomationById(bizId: bigint, id: string | number) {
    const autoId = BigInt(id);
    const automation = await prisma.automation.findFirst({
      where: { id: autoId, bizId, deletedAt: null },
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

  public static async createAutomation(bizId: bigint, data: any) {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.automation.create({
        data: {
          bizId,
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

  public static async toggleAutomation(bizId: bigint, id: string | number, isActive: boolean) {
    const autoId = BigInt(id);
    const existing = await prisma.automation.findFirst({ where: { id: autoId, bizId } });
    if (!existing) throw new AppError('Automation not found', 404, 'AUTOMATION_NOT_FOUND');

    const updated = await prisma.automation.update({
      where: { id: autoId },
      data: { isActive },
    });
    return { ...updated, id: updated.id.toString() };
  }

  public static async updateAutomation(bizId: bigint, id: string | number, data: any) {
    const autoId = BigInt(id);
    const existing = await prisma.automation.findFirst({ where: { id: autoId, bizId } });
    if (!existing) throw new AppError('Automation not found', 404, 'AUTOMATION_NOT_FOUND');

    return await prisma.$transaction(async (tx) => {
      await tx.automation.update({
        where: { id: autoId },
        data: {
          name: data.name,
          description: data.description || null,
          isActive: data.isActive !== undefined ? data.isActive : true,
        },
      });

      if (data.triggers && data.triggers.length > 0) {
        await tx.automationTrigger.deleteMany({ where: { automationId: autoId } });
        await tx.automationTrigger.createMany({
          data: data.triggers.map((t: any) => ({
            automationId: autoId,
            triggerEvent: t.triggerEvent,
            entityType: t.entityType,
            config: t.config ? (typeof t.config === 'string' ? t.config : JSON.stringify(t.config)) : null,
          })),
        });
      }

      if (data.actions && data.actions.length > 0) {
        await tx.automationAction.deleteMany({ where: { automationId: autoId } });
        await tx.automationAction.createMany({
          data: data.actions.map((act: any, idx: number) => ({
            automationId: autoId,
            actionType: act.actionType,
            config: typeof act.config === 'string' ? act.config : JSON.stringify(act.config),
            stepOrder: idx + 1,
          })),
        });
      }

      return this.getAutomationById(bizId, id);
    });
  }

  public static async deleteAutomation(bizId: bigint, id: string | number) {
    const autoId = BigInt(id);
    const existing = await prisma.automation.findFirst({ where: { id: autoId, bizId } });
    if (!existing) throw new AppError('Automation not found', 404, 'AUTOMATION_NOT_FOUND');

    await prisma.automation.update({
      where: { id: autoId },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { success: true };
  }

  public static async duplicateAutomation(bizId: bigint, id: string | number, userId?: string | number) {
    const original = await this.getAutomationById(bizId, id);
    if (!original) throw new AppError('Automation not found', 404, 'AUTOMATION_NOT_FOUND');

    const duplicateData = {
      name: `${original.name} (Bản sao)`,
      description: original.description ? `[Bản sao] ${original.description}` : null,
      isActive: false,
      triggerType: original.triggerType || 'EVENT_BASED',
      priority: original.priority || 10,
      userId: userId || original.createdBy,
      triggers: original.triggers.map((t: any) => ({
        triggerEvent: t.triggerEvent,
        entityType: t.entityType,
        config: t.config,
      })),
      conditions: original.conditions.map((c: any) => ({
        field: c.field,
        operator: c.operator,
        value: c.value,
        logicOperator: c.logicOperator,
      })),
      actions: original.actions.map((act: any) => ({
        actionType: act.actionType,
        config: act.config,
      })),
    };

    return await this.createAutomation(bizId, duplicateData);
  }

  public static async importAutomation(bizId: bigint, importData: any, userId?: string | number) {
    if (!importData || !importData.name || !Array.isArray(importData.triggers)) {
      throw new AppError('Dữ liệu cấu hình tự động hóa không hợp lệ', 400, 'INVALID_IMPORT_DATA');
    }

    const newAutomationData = {
      name: importData.name,
      description: importData.description || null,
      isActive: false,
      triggerType: importData.triggerType || 'EVENT_BASED',
      priority: importData.priority || 10,
      userId: userId || null,
      triggers: importData.triggers.map((t: any) => ({
        triggerEvent: t.triggerEvent,
        entityType: t.entityType,
        config: t.config,
      })),
      conditions: Array.isArray(importData.conditions)
        ? importData.conditions.map((c: any) => ({
            field: c.field,
            operator: c.operator,
            value: c.value,
            logicOperator: c.logicOperator,
          }))
        : [],
      actions: Array.isArray(importData.actions)
        ? importData.actions.map((act: any) => ({
            actionType: act.actionType,
            config: act.config,
          }))
        : [],
    };

    return await this.createAutomation(bizId, newAutomationData);
  }

  public static async getExecutions(bizId: bigint, params: { page?: number; limit?: number; status?: string }) {
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const where: any = { automation: { bizId } };
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
