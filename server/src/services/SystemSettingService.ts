import prisma from '../config/database';
import { AppError } from '../middleware/errorMiddleware';

export interface LeadDuplicateRuleConfig {
  mode: 'LEVEL_1_STAGE_FLAG' | 'LEVEL_2_STAGE_CATEGORY' | 'ALWAYS_MERGE' | 'ALWAYS_NEW';
  openStageCategories?: string[]; // e.g. ["OPEN"] for Level 2
}

export const DEFAULT_LEAD_DUPLICATE_CONFIG: LeadDuplicateRuleConfig = {
  mode: 'LEVEL_1_STAGE_FLAG',
  openStageCategories: ['OPEN'],
};

export class SystemSettingService {
  static async getSetting<T = any>(bizId: bigint, key: string, defaultValue: T): Promise<T> {
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: {
          bizId_key: {
            bizId,
            key,
          },
        },
      });
      if (!setting || !setting.value) {
        return defaultValue;
      }
      return setting.value as T;
    } catch (error) {
      console.error(`[SystemSettingService] Error getting setting ${key}:`, error);
      return defaultValue;
    }
  }

  static async setSetting<T = any>(bizId: bigint, key: string, value: T, description?: string): Promise<T> {
    const setting = await prisma.systemSetting.upsert({
      where: {
        bizId_key: {
          bizId,
          key,
        },
      },
      update: {
        value: value as any,
        description: description || null,
      },
      create: {
        bizId,
        key,
        value: value as any,
        description: description || null,
      },
    });
    return setting.value as T;
  }

  static async getLeadDuplicateRule(bizId: bigint): Promise<LeadDuplicateRuleConfig> {
    return this.getSetting<LeadDuplicateRuleConfig>(
      bizId,
      'LEAD_DUPLICATE_RULE',
      DEFAULT_LEAD_DUPLICATE_CONFIG
    );
  }

  static async updateLeadDuplicateRule(bizId: bigint, config: LeadDuplicateRuleConfig): Promise<LeadDuplicateRuleConfig> {
    return this.setSetting<LeadDuplicateRuleConfig>(
      bizId,
      'LEAD_DUPLICATE_RULE',
      config,
      'Cấu hình quy tắc Gộp hoặc Tạo mới Lead khi phát sinh sản phẩm quan tâm mới'
    );
  }

  static async getSmaxApiToken(bizId?: bigint, throwOnMissing: boolean = true): Promise<string> {
    // 1. Check process.env if provided
    if (process.env.SMAX_API_TOKEN && process.env.SMAX_API_TOKEN.trim()) {
      return process.env.SMAX_API_TOKEN.trim();
    }

    // 2. Check if system setting exists globally or for target biz
    const targetBizId = bizId || BigInt(1);
    const saved = await this.getSetting<string>(targetBizId, 'SMAX_API_TOKEN', '');
    if (saved && typeof saved === 'string' && saved.trim()) {
      return saved.trim();
    }

    // 3. Fallback search for any biz setting in DB
    const anySetting = await prisma.systemSetting.findFirst({
      where: { key: 'SMAX_API_TOKEN' },
    });
    if (anySetting && anySetting.value && typeof anySetting.value === 'string' && (anySetting.value as string).trim()) {
      return (anySetting.value as string).trim();
    }

    if (!throwOnMissing) {
      return '';
    }

    throw new AppError(
      'Chưa cấu hình Smax API Token trong hệ thống. Vui lòng vào Cài đặt hệ thống để cập nhật Token.',
      400,
      'SMAX_TOKEN_MISSING'
    );
  }

  static async setSmaxApiToken(token: string, bizId?: bigint): Promise<string> {
    const targetBizId = bizId || BigInt(1);
    return this.setSetting<string>(
      targetBizId,
      'SMAX_API_TOKEN',
      token.trim(),
      'Authorization Bearer Token cho Smax.ai API'
    );
  }
}
