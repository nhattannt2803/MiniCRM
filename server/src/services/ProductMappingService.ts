import prisma from '../config/database';
import { AppError } from '../middleware/errorMiddleware';

export class ProductMappingService {
  static async getProductMappings(bizId: bigint) {
    const mappings = await prisma.productMapping.findMany({
      where: { bizId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            code: true,
            unitPrice: true,
            currency: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return mappings.map((m) => ({
      ...m,
      id: m.id.toString(),
      bizId: m.bizId.toString(),
      productId: m.productId.toString(),
      product: m.product
        ? {
            ...m.product,
            id: m.product.id.toString(),
            unitPrice: Number(m.product.unitPrice),
          }
        : null,
    }));
  }

  static async createProductMapping(
    bizId: bigint,
    externalCode: string,
    externalName?: string,
    productId?: bigint | string
  ) {
    if (!externalCode || !externalCode.trim()) {
      throw new AppError('Vui lòng nhập Mã sản phẩm bên ngoài (externalCode)', 400, 'MISSING_EXTERNAL_CODE');
    }
    if (!productId) {
      throw new AppError('Vui lòng chọn Sản phẩm CRM để mapping', 400, 'MISSING_PRODUCT_ID');
    }

    const cleanCode = externalCode.trim();
    const pId = BigInt(productId);

    // Verify CRM product belongs to this bizId
    const product = await prisma.product.findFirst({
      where: { id: pId, bizId, deletedAt: null },
    });

    if (!product) {
      throw new AppError('Sản phẩm CRM không tồn tại hoặc không thuộc Doanh nghiệp này', 404, 'PRODUCT_NOT_FOUND');
    }

    // Check duplicate code
    const existing = await prisma.productMapping.findFirst({
      where: { bizId, externalCode: cleanCode },
    });

    if (existing) {
      throw new AppError(`Mã sản phẩm '${cleanCode}' đã được mapping cho sản phẩm khác trong hệ thống`, 400, 'DUPLICATE_EXTERNAL_CODE');
    }

    const created = await prisma.productMapping.create({
      data: {
        bizId,
        externalCode: cleanCode,
        externalName: externalName ? externalName.trim() : null,
        productId: pId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            code: true,
            unitPrice: true,
            currency: true,
          },
        },
      },
    });

    return {
      ...created,
      id: created.id.toString(),
      bizId: created.bizId.toString(),
      productId: created.productId.toString(),
      product: created.product
        ? {
            ...created.product,
            id: created.product.id.toString(),
            unitPrice: Number(created.product.unitPrice),
          }
        : null,
    };
  }

  static async updateProductMapping(
    bizId: bigint,
    mappingId: bigint | string,
    data: { externalCode?: string; externalName?: string; productId?: bigint | string }
  ) {
    const id = BigInt(mappingId);
    const existing = await prisma.productMapping.findFirst({
      where: { id, bizId },
    });

    if (!existing) {
      throw new AppError('Mã mapping sản phẩm không tồn tại', 404, 'MAPPING_NOT_FOUND');
    }

    const updateData: any = {};
    if (data.externalCode !== undefined) {
      if (!data.externalCode.trim()) {
        throw new AppError('Mã sản phẩm bên ngoài không được để trống', 400, 'INVALID_EXTERNAL_CODE');
      }
      const cleanCode = data.externalCode.trim();
      if (cleanCode !== existing.externalCode) {
        const dup = await prisma.productMapping.findFirst({
          where: { bizId, externalCode: cleanCode, NOT: { id } },
        });
        if (dup) {
          throw new AppError(`Mã sản phẩm '${cleanCode}' đã tồn tại trong danh sách mapping`, 400, 'DUPLICATE_EXTERNAL_CODE');
        }
      }
      updateData.externalCode = cleanCode;
    }

    if (data.externalName !== undefined) {
      updateData.externalName = data.externalName ? data.externalName.trim() : null;
    }

    if (data.productId !== undefined) {
      const pId = BigInt(data.productId);
      const product = await prisma.product.findFirst({
        where: { id: pId, bizId, deletedAt: null },
      });
      if (!product) {
        throw new AppError('Sản phẩm CRM không tồn tại', 404, 'PRODUCT_NOT_FOUND');
      }
      updateData.productId = pId;
    }

    const updated = await prisma.productMapping.update({
      where: { id },
      data: updateData,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            code: true,
            unitPrice: true,
            currency: true,
          },
        },
      },
    });

    return {
      ...updated,
      id: updated.id.toString(),
      bizId: updated.bizId.toString(),
      productId: updated.productId.toString(),
      product: updated.product
        ? {
            ...updated.product,
            id: updated.product.id.toString(),
            unitPrice: Number(updated.product.unitPrice),
          }
        : null,
    };
  }

  static async deleteProductMapping(bizId: bigint, mappingId: bigint | string) {
    const id = BigInt(mappingId);
    const existing = await prisma.productMapping.findFirst({
      where: { id, bizId },
    });

    if (!existing) {
      throw new AppError('Mã mapping sản phẩm không tồn tại', 404, 'MAPPING_NOT_FOUND');
    }

    await prisma.productMapping.delete({ where: { id } });
    return { success: true, message: 'Xóa mapping sản phẩm thành công' };
  }

  /**
   * Resolves a raw list of product items passed in webhook/API (e.g. [{ code: 'SP001' }, 'SP002'])
   * to CRM product IDs and collects any unmapped product codes into a warning string.
   */
  static async resolveProductCodes(bizId: bigint, inputProducts: any[]) {
    if (!Array.isArray(inputProducts) || inputProducts.length === 0) {
      return { matchedProductIds: [], missingCodes: [], warningMessage: null };
    }

    // Extract item codes/identifiers from input array
    const rawCodes: string[] = [];
    inputProducts.forEach((item) => {
      if (typeof item === 'string' || typeof item === 'number') {
        const str = String(item).trim();
        if (str) rawCodes.push(str);
      } else if (item && typeof item === 'object') {
        const code = String(item.code || item.product_code || item.sku || item.id || item.productCode || item.name || '').trim();
        if (code) rawCodes.push(code);
      }
    });

    const uniqueCodes = Array.from(new Set(rawCodes));
    if (uniqueCodes.length === 0) {
      return { matchedProductIds: [], missingCodes: [], warningMessage: null };
    }

    // Fetch mappings for these externalCodes
    const mappings = await prisma.productMapping.findMany({
      where: {
        bizId,
        externalCode: { in: uniqueCodes },
      },
      select: {
        externalCode: true,
        productId: true,
      },
    });

    // Also fetch direct CRM Products matching code or id
    const directProducts = await prisma.product.findMany({
      where: {
        bizId,
        deletedAt: null,
        OR: [
          { code: { in: uniqueCodes } },
          { name: { in: uniqueCodes } },
        ],
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    const mappingMap = new Map<string, bigint>();
    mappings.forEach((m) => mappingMap.set(m.externalCode.toLowerCase(), m.productId));

    const directProductMap = new Map<string, bigint>();
    directProducts.forEach((p) => {
      directProductMap.set(p.code.toLowerCase(), p.id);
      directProductMap.set(p.name.toLowerCase(), p.id);
    });

    const matchedProductIds: bigint[] = [];
    const missingCodes: string[] = [];

    uniqueCodes.forEach((code) => {
      const lower = code.toLowerCase();
      let foundId = mappingMap.get(lower);
      if (!foundId) {
        foundId = directProductMap.get(lower);
      }

      if (foundId) {
        if (!matchedProductIds.includes(foundId)) {
          matchedProductIds.push(foundId);
        }
      } else {
        missingCodes.push(code);
      }
    });

    let warningMessage: string | null = null;
    if (missingCodes.length > 0) {
      warningMessage = `sản phẩm mã ${missingCodes.join(', ')} không có mapping`;
    }

    return {
      matchedProductIds,
      missingCodes,
      warningMessage,
    };
  }
}
