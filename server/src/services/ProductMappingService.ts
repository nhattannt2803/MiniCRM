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

    const mappingMap = new Map<string, bigint[]>();
    mappings.forEach((m) => {
      const key = m.externalCode.toLowerCase();
      const list = mappingMap.get(key) || [];
      list.push(m.productId);
      mappingMap.set(key, list);
    });

    const directProductMap = new Map<string, bigint>();
    directProducts.forEach((p) => {
      directProductMap.set(p.code.toLowerCase(), p.id);
      directProductMap.set(p.name.toLowerCase(), p.id);
    });

    const matchedProductIds: bigint[] = [];
    const missingCodes: string[] = [];

    uniqueCodes.forEach((code) => {
      const lower = code.toLowerCase();
      const foundIds = mappingMap.get(lower);
      let matched = false;

      if (foundIds && foundIds.length > 0) {
        foundIds.forEach((pId) => {
          if (!matchedProductIds.includes(pId)) {
            matchedProductIds.push(pId);
          }
        });
        matched = true;
      }

      if (!matched) {
        const directId = directProductMap.get(lower);
        if (directId) {
          if (!matchedProductIds.includes(directId)) {
            matchedProductIds.push(directId);
          }
          matched = true;
        }
      }

      if (!matched) {
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

  /**
   * Bulk import product mappings for a business.
   * Logic:
   * - If exact match (externalCode + productId exists), SKIP row.
   * - If externalCode exists for a DIFFERENT CRM product, create BOTH and add notes referencing the previous product.
   * - If externalCode is new, create mapping normally.
   */
  static async bulkImportProductMappings(
    bizId: bigint,
    records: Array<{
      externalCode: string;
      externalName?: string;
      productCode?: string;
      productId?: string | number | bigint;
      productName?: string;
    }>,
    options: { updateExisting?: boolean } = { updateExisting: true }
  ) {
    if (!Array.isArray(records) || records.length === 0) {
      throw new AppError('Danh sách data import không được để trống', 400, 'EMPTY_IMPORT_DATA');
    }

    const crmProducts = await prisma.product.findMany({
      where: { bizId, deletedAt: null },
      select: { id: true, code: true, name: true },
    });

    const codeToIdMap = new Map<string, bigint>();
    const idToIdMap = new Map<string, bigint>();
    const nameToIdMap = new Map<string, bigint>();
    const productByIdMap = new Map<string, { id: bigint; code: string; name: string }>();

    crmProducts.forEach((p) => {
      idToIdMap.set(p.id.toString(), p.id);
      productByIdMap.set(p.id.toString(), p);
      if (p.code) codeToIdMap.set(p.code.trim().toLowerCase(), p.id);
      if (p.name) nameToIdMap.set(p.name.trim().toLowerCase(), p.id);
    });

    const existingMappings = await prisma.productMapping.findMany({
      where: { bizId },
      include: {
        product: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    type MappingItem = {
      id: bigint;
      productId: bigint;
      productCode: string;
      productName: string;
    };

    const existingMap = new Map<string, MappingItem[]>();
    existingMappings.forEach((m) => {
      const key = m.externalCode.trim().toLowerCase();
      const list = existingMap.get(key) || [];
      list.push({
        id: m.id,
        productId: m.productId,
        productCode: m.product?.code || '',
        productName: m.product?.name || '',
      });
      existingMap.set(key, list);
    });

    let createdCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const errors: Array<{ line: number; externalCode: string; reason: string }> = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const lineNum = i + 1;
      const rawExtCode = row.externalCode ? String(row.externalCode).trim() : '';

      if (!rawExtCode) {
        failedCount++;
        errors.push({
          line: lineNum,
          externalCode: '',
          reason: 'Mã sản phẩm bên ngoài (externalCode) bị trống',
        });
        continue;
      }

      let matchedProductId: bigint | undefined;

      if (row.productId) {
        matchedProductId = idToIdMap.get(String(row.productId).trim());
      }

      if (!matchedProductId && row.productCode) {
        matchedProductId = codeToIdMap.get(String(row.productCode).trim().toLowerCase());
      }

      if (!matchedProductId && row.productName) {
        matchedProductId = nameToIdMap.get(String(row.productName).trim().toLowerCase());
      }

      if (!matchedProductId) {
        failedCount++;
        const targetStr = row.productCode || row.productId || row.productName || 'chưa chọn';
        errors.push({
          line: lineNum,
          externalCode: rawExtCode,
          reason: `Không tìm thấy sản phẩm CRM tương ứng với mã/tên '${targetStr}'`,
        });
        continue;
      }

      const lowerExtCode = rawExtCode.toLowerCase();
      const existingList = existingMap.get(lowerExtCode) || [];

      // Check if exact same mapping already exists (same externalCode AND same CRM product)
      const exactMatch = existingList.find((item) => item.productId === matchedProductId);
      if (exactMatch) {
        skippedCount++;
        continue;
      }

      // If existing mappings exist for different CRM products, create new mapping with notes referencing previous mapping
      let noteText: string | null = null;
      if (existingList.length > 0) {
        const prevProds = existingList.map((item) => `${item.productName} (${item.productCode})`).join(', ');
        noteText = `Trùng mã với SP trước đó: ${prevProds}`;
      }

      const targetProductObj = productByIdMap.get(matchedProductId.toString());

      try {
        const created = await prisma.productMapping.create({
          data: {
            bizId,
            externalCode: rawExtCode,
            externalName: row.externalName ? String(row.externalName).trim() : null,
            productId: matchedProductId,
            notes: noteText,
          },
        });

        const newItem: MappingItem = {
          id: created.id,
          productId: matchedProductId,
          productCode: targetProductObj?.code || '',
          productName: targetProductObj?.name || '',
        };

        existingList.push(newItem);
        existingMap.set(lowerExtCode, existingList);
        createdCount++;
      } catch (err: any) {
        failedCount++;
        errors.push({
          line: lineNum,
          externalCode: rawExtCode,
          reason: err.message || 'Lỗi tạo dữ liệu trong CSDL',
        });
      }
    }

    return {
      total: records.length,
      createdCount,
      updatedCount: 0,
      skippedCount,
      failedCount,
      successCount: createdCount,
      errors,
    };
  }
}


