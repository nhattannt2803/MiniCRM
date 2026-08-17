import prisma from '../config/database';
import { AppError } from '../middleware/errorMiddleware';

export class PipelineService {
  public static async getPipelines() {
    const pipelines = await prisma.pipeline.findMany({
      where: { isActive: true },
      include: {
        stages: {
          where: { isActive: true },
          orderBy: { orderNo: 'asc' },
        },
      },
    });

    return pipelines.map((p) => ({
      ...p,
      id: p.id.toString(),
      stages: p.stages.map((s) => ({
        ...s,
        id: s.id.toString(),
        pipelineId: s.pipelineId.toString(),
        probability: Number(s.probability),
      })),
    }));
  }

  public static async createPipeline(data: {
    name: string;
    isDefault?: boolean;
    stages?: Array<{
      name: string;
      code?: string;
      orderNo?: number;
      probability?: number;
      isWon?: boolean;
      isLost?: boolean;
    }>;
  }) {
    if (!data.name) {
      throw new AppError('Tên quy trình không được để trống', 400);
    }

    if (data.isDefault) {
      await prisma.pipeline.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const defaultStages = [
      { name: 'Mới tiếp nhận', code: 'NEW', orderNo: 1, probability: 10, isWon: false, isLost: false },
      { name: 'Đã liên hệ / Tư vấn', code: 'CONTACTED', orderNo: 2, probability: 30, isWon: false, isLost: false },
      { name: 'Hẹn lịch xem xe / Demo', code: 'APPOINTMENT', orderNo: 3, probability: 60, isWon: false, isLost: false },
      { name: 'Chốt cọc / Giao xe (Won)', code: 'WON', orderNo: 4, probability: 100, isWon: true, isLost: false },
      { name: 'Khách hủy / Thất bại (Lost)', code: 'LOST', orderNo: 5, probability: 0, isWon: false, isLost: true },
    ];

    const stagesToCreate = (data.stages && data.stages.length > 0 ? data.stages : defaultStages).map((s, idx) => ({
      name: s.name,
      code: s.code || `STAGE_${Date.now()}_${idx}`,
      orderNo: s.orderNo ?? (idx + 1),
      probability: s.probability ?? 0,
      isWon: s.isWon ?? false,
      isLost: s.isLost ?? false,
      isActive: true,
    }));

    const pipeline = await prisma.pipeline.create({
      data: {
        name: data.name,
        isDefault: data.isDefault ?? false,
        isActive: true,
        stages: {
          create: stagesToCreate,
        },
      },
      include: {
        stages: {
          orderBy: { orderNo: 'asc' },
        },
      },
    });

    return {
      ...pipeline,
      id: pipeline.id.toString(),
      stages: pipeline.stages.map((s) => ({
        ...s,
        id: s.id.toString(),
        pipelineId: s.pipelineId.toString(),
        probability: Number(s.probability),
      })),
    };
  }

  public static async updatePipeline(id: string, data: { name?: string; isDefault?: boolean; isActive?: boolean }) {
    const pipelineId = BigInt(id);
    const existing = await prisma.pipeline.findUnique({ where: { id: pipelineId } });
    if (!existing) throw new AppError('Quy trình bán hàng không tồn tại', 404);

    if (data.isDefault) {
      await prisma.pipeline.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.pipeline.update({
      where: { id: pipelineId },
      data: {
        name: data.name !== undefined ? data.name : existing.name,
        isDefault: data.isDefault !== undefined ? data.isDefault : existing.isDefault,
        isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
      },
      include: {
        stages: {
          where: { isActive: true },
          orderBy: { orderNo: 'asc' },
        },
      },
    });

    return {
      ...updated,
      id: updated.id.toString(),
      stages: updated.stages.map((s) => ({
        ...s,
        id: s.id.toString(),
        pipelineId: s.pipelineId.toString(),
        probability: Number(s.probability),
      })),
    };
  }

  public static async deletePipeline(id: string) {
    const pipelineId = BigInt(id);
    const oppCount = await prisma.opportunity.count({
      where: { pipelineId, deletedAt: null },
    });

    if (oppCount > 0) {
      throw new AppError(`Không thể xóa quy trình này vì đang có ${oppCount} cơ hội bán hàng liên quan.`, 400);
    }

    await prisma.pipeline.update({
      where: { id: pipelineId },
      data: { isActive: false },
    });

    return { success: true };
  }

  public static async addStage(pipelineId: string, data: {
    name: string;
    code?: string;
    orderNo?: number;
    probability?: number;
    isWon?: boolean;
    isLost?: boolean;
  }) {
    const pId = BigInt(pipelineId);
    const pipeline = await prisma.pipeline.findUnique({ where: { id: pId } });
    if (!pipeline) throw new AppError('Quy trình bán hàng không tồn tại', 404);

    const count = await prisma.pipelineStage.count({ where: { pipelineId: pId } });
    const code = data.code || `STAGE_${Date.now()}`;

    const stage = await prisma.pipelineStage.create({
      data: {
        pipelineId: pId,
        name: data.name,
        code,
        orderNo: data.orderNo ?? (count + 1),
        probability: data.probability ?? 0,
        isWon: data.isWon ?? false,
        isLost: data.isLost ?? false,
        isActive: true,
      },
    });

    return {
      ...stage,
      id: stage.id.toString(),
      pipelineId: stage.pipelineId.toString(),
      probability: Number(stage.probability),
    };
  }

  public static async updateStage(stageId: string, data: {
    name?: string;
    orderNo?: number;
    probability?: number;
    isWon?: boolean;
    isLost?: boolean;
    isActive?: boolean;
  }) {
    const sId = BigInt(stageId);
    const existing = await prisma.pipelineStage.findUnique({ where: { id: sId } });
    if (!existing) throw new AppError('Giai đoạn không tồn tại', 404);

    const updated = await prisma.pipelineStage.update({
      where: { id: sId },
      data: {
        name: data.name !== undefined ? data.name : existing.name,
        orderNo: data.orderNo !== undefined ? data.orderNo : existing.orderNo,
        probability: data.probability !== undefined ? data.probability : existing.probability,
        isWon: data.isWon !== undefined ? data.isWon : existing.isWon,
        isLost: data.isLost !== undefined ? data.isLost : existing.isLost,
        isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
      },
    });

    return {
      ...updated,
      id: updated.id.toString(),
      pipelineId: updated.pipelineId.toString(),
      probability: Number(updated.probability),
    };
  }

  public static async deleteStage(stageId: string) {
    const sId = BigInt(stageId);
    const oppCount = await prisma.opportunity.count({
      where: { stageId: sId, deletedAt: null },
    });

    if (oppCount > 0) {
      throw new AppError(`Không thể xóa giai đoạn vì có ${oppCount} cơ hội bán hàng đang ở giai đoạn này.`, 400);
    }

    await prisma.pipelineStage.update({
      where: { id: sId },
      data: { isActive: false },
    });

    return { success: true };
  }
}

export class ProductService {
  public static async getProducts(params: { search?: string; type?: string }) {
    const where: any = { deletedAt: null, isActive: true };
    if (params.type) where.type = params.type;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { code: { contains: params.search } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return products.map((p) => ({
      ...p,
      id: p.id.toString(),
      unitPrice: Number(p.unitPrice),
    }));
  }

  public static async createProduct(data: any) {
    const created = await prisma.product.create({
      data: {
        name: data.name,
        code: data.code,
        type: data.type || 'PRODUCT',
        description: data.description || null,
        unitPrice: data.unitPrice || 0,
        currency: data.currency || 'VND',
      },
    });
    return { ...created, id: created.id.toString(), unitPrice: Number(created.unitPrice) };
  }

  public static async getProductById(id: string) {
    const product = await prisma.product.findFirst({
      where: { id: BigInt(id), deletedAt: null },
    });
    if (!product) throw new AppError('Product not found', 404);
    return { ...product, id: product.id.toString(), unitPrice: Number(product.unitPrice) };
  }

  public static async updateProduct(id: string, data: any) {
    const existing = await prisma.product.findFirst({
      where: { id: BigInt(id), deletedAt: null },
    });
    if (!existing) throw new AppError('Product not found', 404);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.unitPrice !== undefined) updateData.unitPrice = data.unitPrice;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await prisma.product.update({
      where: { id: BigInt(id) },
      data: updateData,
    });
    return { ...updated, id: updated.id.toString(), unitPrice: Number(updated.unitPrice) };
  }

  public static async deleteProduct(id: string) {
    const existing = await prisma.product.findFirst({
      where: { id: BigInt(id), deletedAt: null },
    });
    if (!existing) throw new AppError('Product not found', 404);

    await prisma.product.update({
      where: { id: BigInt(id) },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }
}

