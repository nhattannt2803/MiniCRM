import prisma from '../../config/database';
import { automationQueue } from '../../queues/automationQueue';
import { AutomationEngine } from '../engine/AutomationEngine';

let isRunning = false;

export async function processOutboxEvents() {
  if (isRunning) return;
  isRunning = true;

  try {
    const pendingEvents = await prisma.outboxEvent.findMany({
      where: { status: 'PENDING' },
      take: 20,
      orderBy: { createdAt: 'asc' },
    });

    for (const event of pendingEvents) {
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: 'PROCESSING' },
      });

      const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;

      try {
        await automationQueue.add('process-event', {
          eventId: event.eventId,
          eventType: event.eventType,
          entityType: event.entityType,
          entityId: event.entityId.toString(),
          payload,
        });

        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: { status: 'PROCESSED', processedAt: new Date() },
        });
      } catch (redisErr) {
        // Fallback: If Redis is unavailable or fails, run synchronously directly
        console.warn('[OutboxWorker] Queue dispatch failed, executing synchronously fallback:', redisErr);
        await AutomationEngine.processEvent(
          event.eventId,
          event.eventType,
          event.entityType,
          event.entityId,
          payload
        );

        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: { status: 'PROCESSED', processedAt: new Date() },
        });
      }
    }
  } catch (err: any) {
    console.error('[OutboxWorker] Error processing outbox events:', err);
  } finally {
    isRunning = false;
  }
}

export function startOutboxPoller(intervalMs = 3000) {
  console.log(`[OutboxWorker] Starting Transactional Outbox Poller (interval ${intervalMs}ms)...`);
  setInterval(processOutboxEvents, intervalMs);
}
