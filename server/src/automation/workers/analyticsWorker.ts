import prisma from '../../config/database';
import { AnalyticsService } from '../../services/AnalyticsService';

let isRunning = false;

/**
 * Process lead events from outbox for incremental pre-aggregation in `leads_daily_summary`
 */
export async function processAnalyticsOutboxEvents() {
  if (isRunning) return;
  isRunning = true;

  try {
    const pendingLeadEvents = await prisma.outboxEvent.findMany({
      where: {
        entityType: 'LEAD',
        status: 'PENDING',
      },
      take: 50,
      orderBy: { createdAt: 'asc' },
    });

    for (const event of pendingLeadEvents) {
      const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;

      try {
        if (event.eventType === 'LEAD_CREATED' || event.eventType === 'LEAD_CONVERTED' || event.eventType === 'LEAD_STATUS_UPDATED') {
          await AnalyticsService.recordLeadEvent(event.bizId, {
            date: event.createdAt,
            source: payload?.source,
            fbPageId: payload?.fbPageId,
            fbPageName: payload?.fbPageName,
            adId: payload?.adId,
            adName: payload?.adName,
            isConverted: event.eventType === 'LEAD_CONVERTED' || payload?.status === 'CONVERTED',
            cost: payload?.cost ? Number(payload.cost) : 0,
          });
        }
      } catch (err) {
        console.error(`[AnalyticsWorker] Error aggregating event ${event.eventId}:`, err);
      }
    }
  } catch (err: any) {
    console.error('[AnalyticsWorker] Error processing analytics outbox events:', err);
  } finally {
    isRunning = false;
  }
}

/**
 * Start Background Poller Worker for Lead Analytics pre-aggregations
 */
export function startAnalyticsPoller(intervalMs = 5000) {
  console.log(`[AnalyticsWorker] Starting Lead Analytics Aggregate Worker (interval ${intervalMs}ms)...`);
  setInterval(processAnalyticsOutboxEvents, intervalMs);
}
