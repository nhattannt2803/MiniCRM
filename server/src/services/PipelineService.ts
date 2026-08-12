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

