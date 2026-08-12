import { PrismaClient, Prisma } from '@prisma/client';
import prisma from '../config/database';
import crypto from 'crypto';

export type EventType =
  | 'LEAD_CREATED'
  | 'LEAD_UPDATED'
  | 'LEAD_QUALIFIED'
  | 'OPPORTUNITY_CREATED'
  | 'OPPORTUNITY_STAGE_CHANGED'
  | 'OPPORTUNITY_WON'
  | 'OPPORTUNITY_LOST'
  | 'STATUS_CHANGED'
  | 'STAGE_CHANGED'
  | 'TASK_CREATED'
  | 'TASK_OVERDUE'
  | 'ACTIVITY_CREATED';

export type EntityType = 'LEAD' | 'COMPANY' | 'CONTACT' | 'CUSTOMER' | 'OPPORTUNITY' | 'TASK' | 'ACTIVITY';

export async function publishOutboxEvent(
  tx: Prisma.TransactionClient | PrismaClient,
  eventType: EventType,
  entityType: EntityType,
  entityId: number | bigint,
  payload: Record<string, any>
) {
  const eventId = `evt_${crypto.randomBytes(16).toString('hex')}`;
  
  const outboxEvent = await tx.outboxEvent.create({
    data: {
      eventId,
      eventType,
      entityType,
      entityId: BigInt(entityId),
      payload: JSON.stringify(payload),
      status: 'PENDING',
    },
  });

  return outboxEvent;
}
