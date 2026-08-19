import crypto from 'crypto';
import prisma from '../config/database';
import { AppError } from '../middleware/errorMiddleware';

export class ApiKeyService {
  /**
   * Create a new API Key for a Business
   */
  public static async createApiKey(
    bizId: bigint,
    name: string,
    createdById?: bigint | null,
    expiresAt?: Date | null
  ) {
    if (!name || !name.trim()) {
      throw new AppError('Vui lòng nhập tên nhận diện cho API Key', 400, 'INVALID_KEY_NAME');
    }

    // Generate random API key string: mk_live_<32 hex chars>
    const randomHex = crypto.randomBytes(16).toString('hex');
    const rawKey = `mk_live_${randomHex}`;

    const created = await prisma.apiKey.create({
      data: {
        bizId,
        name: name.trim(),
        key: rawKey,
        status: 'ACTIVE',
        createdById: createdById ? BigInt(createdById) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return {
      id: created.id.toString(),
      bizId: created.bizId.toString(),
      name: created.name,
      key: created.key,
      status: created.status,
      lastUsedAt: created.lastUsedAt,
      expiresAt: created.expiresAt,
      createdAt: created.createdAt,
      createdBy: created.createdBy
        ? {
            id: created.createdBy.id.toString(),
            name: `${created.createdBy.lastName} ${created.createdBy.firstName}`.trim(),
            email: created.createdBy.email,
          }
        : null,
    };
  }

  /**
   * Get all API Keys for a Business
   */
  public static async getApiKeys(bizId: bigint) {
    const keys = await prisma.apiKey.findMany({
      where: { bizId },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return keys.map((k) => ({
      id: k.id.toString(),
      bizId: k.bizId.toString(),
      name: k.name,
      keyMasked: `${k.key.slice(0, 12)}...${k.key.slice(-4)}`,
      rawKey: k.key,
      status: k.status,
      lastUsedAt: k.lastUsedAt,
      expiresAt: k.expiresAt,
      createdAt: k.createdAt,
      createdBy: k.createdBy
        ? {
            id: k.createdBy.id.toString(),
            name: `${k.createdBy.lastName} ${k.createdBy.firstName}`.trim(),
            email: k.createdBy.email,
          }
        : null,
    }));
  }

  /**
   * Revoke / Delete an API Key
   */
  public static async revokeApiKey(bizId: bigint, id: string | number) {
    const keyId = BigInt(id);
    const existing = await prisma.apiKey.findFirst({ where: { id: keyId, bizId } });
    if (!existing) {
      throw new AppError('Không tìm thấy API Key', 404, 'API_KEY_NOT_FOUND');
    }

    await prisma.apiKey.delete({ where: { id: keyId } });
    return { success: true, message: 'Đã hủy bỏ và xóa API Key thành công' };
  }

  /**
   * Toggle API Key active status
   */
  public static async toggleApiKeyStatus(bizId: bigint, id: string | number) {
    const keyId = BigInt(id);
    const existing = await prisma.apiKey.findFirst({ where: { id: keyId, bizId } });
    if (!existing) {
      throw new AppError('Không tìm thấy API Key', 404, 'API_KEY_NOT_FOUND');
    }

    const newStatus = existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated = await prisma.apiKey.update({
      where: { id: keyId },
      data: { status: newStatus },
    });

    return {
      id: updated.id.toString(),
      status: updated.status,
      message: `Đã ${newStatus === 'ACTIVE' ? 'kích hoạt' : 'tạm dừng'} API Key thành công`,
    };
  }

  /**
   * Validate API Key from HTTP Header and verify Business binding
   */
  public static async validateApiKey(keyInput: string | undefined | null, targetBizId?: bigint | null) {
    if (!keyInput || !keyInput.trim()) {
      throw new AppError(
        "Vui lòng truyền Header 'x-api-key' (hoặc 'Authorization: Bearer <key>') hợp lệ.",
        401,
        'API_KEY_REQUIRED'
      );
    }

    const cleanKey = keyInput.replace(/^Bearer\s+/i, '').trim();

    const apiKeyRecord = await prisma.apiKey.findFirst({
      where: { key: cleanKey, status: 'ACTIVE' },
      include: { business: true },
    });

    if (!apiKeyRecord) {
      throw new AppError(
        'Header API Key không hợp lệ hoặc đã bị vô hiệu hóa.',
        401,
        'INVALID_API_KEY'
      );
    }

    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
      throw new AppError('API Key đã hết hạn sử dụng.', 401, 'API_KEY_EXPIRED');
    }

    if (apiKeyRecord.business?.status !== 'ACTIVE') {
      throw new AppError('Doanh nghiệp sở hữu API Key này hiện đang tạm dừng.', 403, 'BUSINESS_INACTIVE');
    }

    // Verify bizId match if targetBizId is provided
    if (targetBizId && apiKeyRecord.bizId !== targetBizId) {
      throw new AppError(
        'API Key không thuộc quyền hạn của Doanh nghiệp (Tenant) được chỉ định.',
        403,
        'BIZ_ACCESS_DENIED'
      );
    }

    // Fire & forget update lastUsedAt
    prisma.apiKey
      .update({
        where: { id: apiKeyRecord.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {});

    return apiKeyRecord;
  }
}
