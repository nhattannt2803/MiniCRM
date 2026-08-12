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
    return { ...created, id: created.id.toString() };
  }
}
