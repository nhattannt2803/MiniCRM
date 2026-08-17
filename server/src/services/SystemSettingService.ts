import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface LeadDuplicateRuleConfig {
  mode: 'LEVEL_1_STAGE_FLAG' | 'LEVEL_2_STAGE_CATEGORY' | 'ALWAYS_MERGE' | 'ALWAYS_NEW';
  openStageCategories?: string[]; // e.g. ["OPEN"] for Level 2
}

export const DEFAULT_LEAD_DUPLICATE_CONFIG: LeadDuplicateRuleConfig = {
  mode: 'LEVEL_1_STAGE_FLAG',
  openStageCategories: ['OPEN'],
};

export class SystemSettingService {
  static async getSetting<T = any>(key: string, defaultValue: T): Promise<T> {
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key },
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

  static async setSetting<T = any>(key: string, value: T, description?: string): Promise<T> {
    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: {
        value: value as any,
        description: description || null,
      },
      create: {
        key,
        value: value as any,
        description: description || null,
      },
    });
    return setting.value as T;
  }

  static async getLeadDuplicateRule(): Promise<LeadDuplicateRuleConfig> {
    return this.getSetting<LeadDuplicateRuleConfig>(
      'LEAD_DUPLICATE_RULE',
      DEFAULT_LEAD_DUPLICATE_CONFIG
    );
  }

  static async updateLeadDuplicateRule(config: LeadDuplicateRuleConfig): Promise<LeadDuplicateRuleConfig> {
    return this.setSetting<LeadDuplicateRuleConfig>(
      'LEAD_DUPLICATE_RULE',
      config,
      'Cấu hình quy tắc Gộp hoặc Tạo mới Lead khi phát sinh sản phẩm quan tâm mới'
    );
  }
}
