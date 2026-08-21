import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AnalyticsService } from '../services/AnalyticsService';

export const getLeadsTimeSeries = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const bizId = req.bizId!;
    const { range, fbPageId, source } = req.query;

    const data = await AnalyticsService.getLeadsTimeSeries(bizId, {
      range: range as string,
      fbPageId: fbPageId as string,
      source: source as string,
    });

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const getTopAds = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const bizId = req.bizId!;
    const { range, limit, fbPageId, source } = req.query;

    const data = await AnalyticsService.getTopAds(bizId, {
      range: range as string,
      limit: limit ? parseInt(limit as string, 10) : 10,
      fbPageId: fbPageId as string,
      source: source as string,
    });

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const getAnalyticsSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const bizId = req.bizId!;
    const { range } = req.query;

    const data = await AnalyticsService.getAnalyticsSummary(bizId, {
      range: range as string,
    });

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const triggerBackfill = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const bizId = req.bizId!;

    const result = await AnalyticsService.backfillDailySummary(bizId);

    res.json({
      success: true,
      message: `Backfilled ${result.processedCount} lead analytics records successfully.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
