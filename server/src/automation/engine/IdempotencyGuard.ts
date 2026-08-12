import crypto from 'crypto';

export class IdempotencyGuard {
  public static generateKey(
    automationId: number | bigint,
    eventId: string,
    entityType: string,
    entityId: number | bigint
  ): string {
    const raw = `${automationId}:${eventId}:${entityType}:${entityId}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }
}
