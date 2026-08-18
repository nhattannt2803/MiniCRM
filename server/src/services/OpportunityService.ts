import prisma from '../config/database';
import { publishOutboxEvent } from '../events/outboxPublisher';
import { AppError } from '../middleware/errorMiddleware';

export class OpportunityService {
  public static async getOpportunities(bizId: bigint, params: {
    page?: number;
    limit?: number;
    search?: string;
    pipelineId?: string | number;
    stageId?: string | number;
    status?: string;
    ownerId?: string | number;
  }) {
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where: any = { bizId, deletedAt: null };
    if (params.pipelineId) where.pipelineId = BigInt(params.pipelineId);
    if (params.stageId) where.stageId = BigInt(params.stageId);
    if (params.status) where.status = params.status;
    if (params.ownerId) where.ownerId = BigInt(params.ownerId);

    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { company: { name: { contains: params.search } } },
        { contact: { firstName: { contains: params.search } } },
      ];
    }

    const [total, opps] = await Promise.all([
      prisma.opportunity.count({ where }),
      prisma.opportunity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          stage: true,
          company: { select: { id: true, name: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          owner: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    return {
      data: opps.map((o) => ({
        ...o,
        id: o.id.toString(),
        pipelineId: o.pipelineId.toString(),
        stageId: o.stageId.toString(),
        companyId: o.companyId?.toString(),
        contactId: o.contactId?.toString(),
        ownerId: o.ownerId?.toString(),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  public static async getKanbanBoard(bizId: bigint, pipelineId?: string | number) {
    let pId: bigint;
    if (pipelineId) {
      pId = BigInt(pipelineId);
    } else {
      const defaultPipeline = await prisma.pipeline.findFirst({ where: { bizId, isDefault: true } });
      if (!defaultPipeline) throw new AppError('No default pipeline found', 404, 'PIPELINE_NOT_FOUND');
      pId = defaultPipeline.id;
    }

    const stages = await prisma.pipelineStage.findMany({
      where: { pipelineId: pId, isActive: true },
      orderBy: { orderNo: 'asc' },
    });

    const opps = await prisma.opportunity.findMany({
      where: { bizId, pipelineId: pId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const columns = stages.map((stage) => {
      const stageOpps = opps.filter((o) => o.stageId === stage.id);
      const totalAmount = stageOpps.reduce((sum, o) => sum + Number(o.amount), 0);
      return {
        stageId: stage.id.toString(),
        name: stage.name,
        code: stage.code,
        orderNo: stage.orderNo,
        probability: Number(stage.probability),
        isWon: stage.isWon,
        isLost: stage.isLost,
        totalAmount,
        deals: stageOpps.map((o) => ({
          ...o,
          id: o.id.toString(),
          pipelineId: o.pipelineId.toString(),
          stageId: o.stageId.toString(),
          companyId: o.companyId?.toString(),
          contactId: o.contactId?.toString(),
          ownerId: o.ownerId?.toString(),
        })),
      };
    });

    return { pipelineId: pId.toString(), columns };
  }

  public static async getOpportunityById(bizId: bigint, id: string | number) {
    const oppId = BigInt(id);
    const opp = await prisma.opportunity.findFirst({
      where: { id: oppId, bizId, deletedAt: null },
      include: {
        stage: true,
        pipeline: true,
        company: true,
        contact: true,
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        products: { include: { product: true } },
        quotes: true,
        stageHistories: {
          orderBy: { changedAt: 'desc' },
          include: {
            fromStage: true,
            toStage: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!opp) throw new AppError('Opportunity not found', 404, 'OPPORTUNITY_NOT_FOUND');

    const [activities, tasks] = await Promise.all([
      prisma.activity.findMany({
        where: { bizId, relatedType: 'OPPORTUNITY', relatedId: oppId },
        orderBy: { createdAt: 'desc' },
        include: { owner: { select: { firstName: true, lastName: true } } },
      }),
      prisma.task.findMany({
        where: { bizId, relatedType: 'OPPORTUNITY', relatedId: oppId },
        orderBy: { dueAt: 'asc' },
        include: { assignee: { select: { firstName: true, lastName: true } } },
      }),
    ]);

    return {
      ...opp,
      id: opp.id.toString(),
      pipelineId: opp.pipelineId.toString(),
      stageId: opp.stageId.toString(),
      companyId: opp.companyId?.toString(),
      contactId: opp.contactId?.toString(),
      ownerId: opp.ownerId?.toString(),
      products: opp.products.map((p) => ({
        ...p,
        id: p.id.toString(),
        opportunityId: p.opportunityId.toString(),
        productId: p.productId.toString(),
      })),
      quotes: opp.quotes.map((q) => ({ ...q, id: q.id.toString(), opportunityId: q.opportunityId.toString() })),
      stageHistories: opp.stageHistories.map((h) => ({
        ...h,
        id: h.id.toString(),
        opportunityId: h.opportunityId.toString(),
      })),
      activities: activities.map((a) => ({ ...a, id: a.id.toString() })),
      tasks: tasks.map((t) => ({ ...t, id: t.id.toString() })),
    };
  }

  public static async createOpportunity(bizId: bigint, data: any) {
    return await prisma.$transaction(async (tx) => {
      const pipelineId = BigInt(data.pipelineId);
      const stageId = BigInt(data.stageId);

      const stage = await tx.pipelineStage.findUnique({ where: { id: stageId } });
      if (!stage) throw new AppError('Pipeline stage not found', 400, 'STAGE_NOT_FOUND');

      let status = 'OPEN';
      let wonAt = null;
      let lostAt = null;
      if (stage.isWon) {
        status = 'WON';
        wonAt = new Date();
      } else if (stage.isLost) {
        status = 'LOST';
        lostAt = new Date();
      }

      const opp = await tx.opportunity.create({
        data: {
          bizId,
          name: data.name,
          companyId: data.companyId ? BigInt(data.companyId) : null,
          contactId: data.contactId ? BigInt(data.contactId) : null,
          leadId: data.leadId ? BigInt(data.leadId) : null,
          campaignId: data.campaignId ? BigInt(data.campaignId) : null,
          ownerId: data.ownerId ? BigInt(data.ownerId) : null,
          pipelineId,
          stageId,
          amount: data.amount || 0.0,
          probability: stage.probability,
          expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
          source: data.source || null,
          description: data.description || null,
          status,
          wonAt,
          lostAt,
        },
      });

      // Stage history
      await tx.opportunityStageHistory.create({
        data: {
          opportunityId: opp.id,
          toStageId: stageId,
          changedBy: data.userId ? BigInt(data.userId) : data.ownerId ? BigInt(data.ownerId) : null,
        },
      });

      // Publish event
      await publishOutboxEvent(tx, bizId, 'OPPORTUNITY_CREATED', 'OPPORTUNITY', opp.id, {
        id: opp.id.toString(),
        name: opp.name,
        amount: opp.amount,
        stage_id: stageId.toString(),
        stage_code: stage.code,
        status: opp.status,
        owner_id: opp.ownerId?.toString(),
      });

      return { ...opp, id: opp.id.toString() };
    });
  }

  public static async updateStage(bizId: bigint, id: string | number, newStageId: string | number, userId?: string | number) {
    const oppId = BigInt(id);
    const targetStageId = BigInt(newStageId);

    return await prisma.$transaction(async (tx) => {
      const opp = await tx.opportunity.findFirst({ where: { id: oppId, bizId, deletedAt: null } });
      if (!opp) throw new AppError('Opportunity not found', 404, 'OPPORTUNITY_NOT_FOUND');

      if (opp.stageId === targetStageId) return { ...opp, id: opp.id.toString() };

      const fromStageId = opp.stageId;
      const toStage = await tx.pipelineStage.findUnique({ where: { id: targetStageId } });
      if (!toStage) throw new AppError('Target stage not found', 400, 'STAGE_NOT_FOUND');

      let status = 'OPEN';
      let wonAt = opp.wonAt;
      let lostAt = opp.lostAt;

      if (toStage.isWon) {
        status = 'WON';
        wonAt = new Date();
      } else if (toStage.isLost) {
        status = 'LOST';
        lostAt = new Date();
      }

      // Calculate time in previous stage
      const lastHistory = await tx.opportunityStageHistory.findFirst({
        where: { opportunityId: oppId },
        orderBy: { changedAt: 'desc' },
      });
      const now = new Date();
      const duration = lastHistory
        ? Math.floor((now.getTime() - lastHistory.changedAt.getTime()) / 1000)
        : null;

      const updated = await tx.opportunity.update({
        where: { id: oppId },
        data: {
          stageId: targetStageId,
          probability: toStage.probability,
          status,
          wonAt,
          lostAt,
        },
      });

      // Record stage history
      await tx.opportunityStageHistory.create({
        data: {
          opportunityId: oppId,
          fromStageId,
          toStageId: targetStageId,
          changedBy: userId ? BigInt(userId) : null,
          durationInSeconds: duration ? BigInt(duration) : null,
        },
      });

      // Publish Outbox Event
      let eventType: any = 'OPPORTUNITY_STAGE_CHANGED';
      if (status === 'WON') eventType = 'OPPORTUNITY_WON';
      if (status === 'LOST') eventType = 'OPPORTUNITY_LOST';

      await publishOutboxEvent(tx, bizId, eventType, 'OPPORTUNITY', oppId, {
        id: oppId.toString(),
        name: updated.name,
        amount: updated.amount,
        stage_id: targetStageId.toString(),
        stage_code: toStage.code,
        from_stage_id: fromStageId.toString(),
        status,
        owner_id: updated.ownerId?.toString(),
      });

      return { ...updated, id: updated.id.toString() };
    });
  }

  public static async updateOpportunity(bizId: bigint, id: string | number, data: any) {
    const oppId = BigInt(id);
    const existing = await prisma.opportunity.findFirst({ where: { id: oppId, bizId, deletedAt: null } });
    if (!existing) throw new AppError('Opportunity not found', 404, 'OPPORTUNITY_NOT_FOUND');

    const updated = await prisma.opportunity.update({
      where: { id: oppId },
      data: {
        name: data.name,
        amount: data.amount !== undefined ? data.amount : undefined,
        probability: data.probability !== undefined ? data.probability : undefined,
        expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : undefined,
        description: data.description,
        lostReason: data.lostReason,
        ownerId: data.ownerId ? BigInt(data.ownerId) : undefined,
      },
    });
    return { ...updated, id: updated.id.toString() };
  }

  public static async addProduct(bizId: bigint, oppId: string | number, productId: string | number, quantity: number, unitPrice: number) {
    const opportunityId = BigInt(oppId);
    const prodId = BigInt(productId);

    const opp = await prisma.opportunity.findFirst({ where: { id: opportunityId, bizId, deletedAt: null } });
    if (!opp) throw new AppError('Opportunity not found', 404, 'OPPORTUNITY_NOT_FOUND');

    const totalPrice = quantity * unitPrice;

    const op = await prisma.opportunityProduct.create({
      data: {
        opportunityId,
        productId: prodId,
        quantity,
        unitPrice,
        totalPrice,
      },
    });

    // Update opportunity total amount
    const totalAmount = await prisma.opportunityProduct.aggregate({
      where: { opportunityId },
      _sum: { totalPrice: true },
    });

    if (totalAmount._sum.totalPrice) {
      await prisma.opportunity.update({
        where: { id: opportunityId },
        data: { amount: totalAmount._sum.totalPrice },
      });
    }

    return { ...op, id: op.id.toString() };
  }
}
