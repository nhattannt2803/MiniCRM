import prisma from '../config/database';

export class AnalyticsService {
  /**
   * Incrementally record/upsert a lead metric into `leads_daily_summary`
   */
  static async recordLeadEvent(
    bizId: bigint,
    data: {
      date?: Date;
      source?: string;
      fbPageId?: string;
      fbPageName?: string;
      adId?: string;
      adName?: string;
      isConverted?: boolean;
      cost?: number;
      clicks?: number;
    }
  ) {
    const targetDate = data.date ? new Date(data.date) : new Date();
    // Normalize date to YYYY-MM-DD 00:00:00 UTC
    const day = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate()));

    const source = data.source || 'UNKNOWN';
    const fbPageId = data.fbPageId || 'UNKNOWN';
    const fbPageName = data.fbPageName || null;
    const adId = data.adId || 'UNKNOWN';
    const adName = data.adName || null;
    const isConverted = !!data.isConverted;
    const cost = data.cost || 0;
    const clicks = data.clicks || 0;

    // Perform upsert matching unique key (bizId, day, source, fbPageId, adId)
    const existing = await prisma.leadsDailySummary.findFirst({
      where: {
        bizId,
        day,
        source,
        fbPageId,
        adId,
      },
    });

    if (existing) {
      return prisma.leadsDailySummary.update({
        where: { id: existing.id },
        data: {
          leadsCount: { increment: 1 },
          convertedCount: isConverted ? { increment: 1 } : undefined,
          costSum: { increment: cost },
          clicksCount: { increment: clicks },
          fbPageName: fbPageName || existing.fbPageName,
          adName: adName || existing.adName,
        },
      });
    } else {
      return prisma.leadsDailySummary.create({
        data: {
          bizId,
          day,
          source,
          fbPageId,
          fbPageName,
          adId,
          adName,
          leadsCount: 1,
          convertedCount: isConverted ? 1 : 0,
          costSum: cost,
          clicksCount: clicks,
        },
      });
    }
  }

  /**
   * Helper to parse date range filter
   */
  private static parseRange(range = '30d') {
    const endDate = new Date();
    let startDate = new Date();

    if (range === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (range === '7d') {
      startDate.setDate(endDate.getDate() - 7);
    } else if (range === 'this_month') {
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    } else {
      // default 30d
      startDate.setDate(endDate.getDate() - 30);
    }

    return { startDate, endDate };
  }

  /**
   * Get Time Series data for Lead count & Ad spend by day
   */
  static async getLeadsTimeSeries(
    bizId: bigint,
    options: { range?: string; fbPageId?: string; source?: string } = {}
  ) {
    const { startDate, endDate } = this.parseRange(options.range);

    const whereClause: any = {
      bizId,
      day: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (options.fbPageId && options.fbPageId !== 'all') {
      whereClause.fbPageId = options.fbPageId;
    }
    if (options.source && options.source !== 'all') {
      whereClause.source = options.source;
    }

    const summaries = await prisma.leadsDailySummary.findMany({
      where: whereClause,
      orderBy: { day: 'asc' },
    });

    // Group by day string
    const map = new Map<string, { date: string; leads: number; converted: number; cost: number; cpl: number }>();

    for (const item of summaries) {
      const dateKey = item.day.toISOString().split('T')[0];
      const current = map.get(dateKey) || { date: dateKey, leads: 0, converted: 0, cost: 0, cpl: 0 };

      current.leads += item.leadsCount;
      current.converted += item.convertedCount;
      current.cost += Number(item.costSum || 0);

      map.set(dateKey, current);
    }

    // Compute CPL for each day
    const result = Array.from(map.values()).map((row) => ({
      ...row,
      cpl: row.leads > 0 ? Math.round(row.cost / row.leads) : 0,
    }));

    // Fallback: If summary table has 0 records, aggregate directly from raw `leads` table
    if (result.length === 0) {
      const rawLeads = await prisma.lead.findMany({
        where: {
          bizId,
          createdAt: { gte: startDate, lte: endDate },
          ...(options.fbPageId && options.fbPageId !== 'all' ? { fbPageId: options.fbPageId } : {}),
          ...(options.source && options.source !== 'all' ? { source: options.source } : {}),
        },
        select: {
          createdAt: true,
          status: true,
          cost: true,
        },
      });

      const rawMap = new Map<string, { date: string; leads: number; converted: number; cost: number; cpl: number }>();

      for (const lead of rawLeads) {
        const dateKey = lead.createdAt.toISOString().split('T')[0];
        const current = rawMap.get(dateKey) || { date: dateKey, leads: 0, converted: 0, cost: 0, cpl: 0 };

        current.leads += 1;
        if (lead.status === 'CONVERTED') current.converted += 1;
        if (lead.cost) current.cost += Number(lead.cost);

        rawMap.set(dateKey, current);
      }

      return Array.from(rawMap.values()).map((row) => ({
        ...row,
        cpl: row.leads > 0 ? Math.round(row.cost / row.leads) : 0,
      }));
    }

    return result;
  }

  /**
   * Get Top Ads Performance Breakdown
   */
  static async getTopAds(
    bizId: bigint,
    options: { range?: string; limit?: number; fbPageId?: string; source?: string } = {}
  ) {
    const { startDate, endDate } = this.parseRange(options.range);
    const limit = options.limit || 10;

    const whereClause: any = {
      bizId,
      day: { gte: startDate, lte: endDate },
    };

    if (options.fbPageId && options.fbPageId !== 'all') {
      whereClause.fbPageId = options.fbPageId;
    }
    if (options.source && options.source !== 'all') {
      whereClause.source = options.source;
    }

    const summaries = await prisma.leadsDailySummary.findMany({
      where: whereClause,
    });

    const adMap = new Map<
      string,
      {
        ad_id: string;
        ad_name: string;
        page_name: string;
        pageid: string;
        source: string;
        leads: number;
        converted: number;
        cost: number;
      }
    >();

    for (const s of summaries) {
      const key = `${s.adId}_${s.fbPageId}`;
      const current = adMap.get(key) || {
        ad_id: s.adId,
        ad_name: s.adName || s.adId,
        page_name: s.fbPageName || s.fbPageId,
        pageid: s.fbPageId,
        source: s.source,
        leads: 0,
        converted: 0,
        cost: 0,
      };

      current.leads += s.leadsCount;
      current.converted += s.convertedCount;
      current.cost += Number(s.costSum || 0);

      adMap.set(key, current);
    }

    const adsList = Array.from(adMap.values())
      .map((ad) => {
        const cpl = ad.leads > 0 ? Math.round(ad.cost / ad.leads) : 0;
        const convRate = ad.leads > 0 ? Number(((ad.converted / ad.leads) * 100).toFixed(1)) : 0;
        let performanceTag: 'TOP_ROI' | 'GOOD' | 'HIGH_CPL' = 'GOOD';

        if (cpl > 0 && cpl < 35000 && convRate > 25) performanceTag = 'TOP_ROI';
        else if (cpl > 45000) performanceTag = 'HIGH_CPL';

        return {
          ...ad,
          cpl,
          convRate,
          performanceTag,
        };
      })
      .sort((a, b) => b.leads - a.leads)
      .slice(0, limit);

    return adsList;
  }

  /**
   * Get Overall Summary KPIs
   */
  static async getAnalyticsSummary(bizId: bigint, options: { range?: string } = {}) {
    const timeSeries = await this.getLeadsTimeSeries(bizId, options);
    const topAds = await this.getTopAds(bizId, { ...options, limit: 1 });

    const totalLeads = timeSeries.reduce((sum, r) => sum + r.leads, 0);
    const totalConverted = timeSeries.reduce((sum, r) => sum + r.converted, 0);
    const totalCost = timeSeries.reduce((sum, r) => sum + r.cost, 0);
    const avgCpl = totalLeads > 0 ? Math.round(totalCost / totalLeads) : 0;
    const convRate = totalLeads > 0 ? Number(((totalConverted / totalLeads) * 100).toFixed(1)) : 0;

    return {
      totalLeads,
      totalConverted,
      totalCost,
      avgCpl,
      convRate,
      topAdId: topAds[0]?.ad_id || 'N/A',
      topPageName: topAds[0]?.page_name || 'N/A',
    };
  }

  /**
   * Backfill Daily Summary table from raw `leads` table
   */
  static async backfillDailySummary(bizId: bigint) {
    const rawLeads = await prisma.lead.findMany({
      where: { bizId },
      select: {
        bizId: true,
        source: true,
        fbPageId: true,
        fbPageName: true,
        status: true,
        cost: true,
        createdAt: true,
      },
    });

    let processedCount = 0;
    for (const lead of rawLeads) {
      await this.recordLeadEvent(lead.bizId, {
        date: lead.createdAt,
        source: lead.source,
        fbPageId: lead.fbPageId || 'UNKNOWN',
        fbPageName: lead.fbPageName || undefined,
        adId: 'INGESTED_LEAD',
        adName: 'Backfilled Lead',
        isConverted: lead.status === 'CONVERTED',
        cost: lead.cost ? Number(lead.cost) : 0,
      });
      processedCount++;
    }

    return { success: true, processedCount };
  }
}
