import { Worker, Job } from 'bullmq';
import dotenv from 'dotenv';
import { AutomationEngine } from '../engine/AutomationEngine';

dotenv.config();

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

export const startAutomationWorker = () => {
  console.log('[AutomationWorker] Starting BullMQ Automation Worker...');

  const worker = new Worker(
    'automation-queue',
    async (job: Job) => {
      const { eventId, eventType, entityType, entityId, payload } = job.data;
      console.log(`[BullMQ Worker] Processing Job ${job.id} for event ${eventType}`);
      await AutomationEngine.processEvent(eventId, eventType, entityType, BigInt(entityId), payload);
    },
    { connection, concurrency: 5 }
  );

  worker.on('completed', (job: Job) => {
    console.log(`[BullMQ Worker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(`[BullMQ Worker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
};
