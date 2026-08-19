import prisma from '../config/database';

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

  static async getSmaxApiToken(bizId?: bigint): Promise<string> {
    const defaultToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYyYzI4OTMyM2YwZjIzMmRjNmMxMjk5OSIsImlzX3VzZXIiOnRydWUsImRldmljZV9pZCI6IjgwOTc3OGJhLTdkYTYtNDEyZS1hMjNjLTdmODI2ZTlkZmQzMSIsImlhdCI6MTc4NzExMjE5NywiZXhwIjoxNzg5NzA0MTk3fQ.1QEZIv8aos7iqDnn8Lwk2LHU3rkSh8OjI3pV76cBJWk';
    
    // Check if system setting exists globally or for target biz
    const targetBizId = bizId || BigInt(1);
    const saved = await this.getSetting<string>(targetBizId, 'SMAX_API_TOKEN', '');
    if (saved && saved.trim()) return saved.trim();

    // Fallback search for any biz setting
    const anySetting = await prisma.systemSetting.findFirst({
      where: { key: 'SMAX_API_TOKEN' },
    });
    if (anySetting && anySetting.value) {
      return (anySetting.value as string).trim();
    }

    return defaultToken;
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
