import { ConditionEvaluator } from '../src/automation/engine/ConditionEvaluator';
import { IdempotencyGuard } from '../src/automation/engine/IdempotencyGuard';

describe('Automation Engine Core Logic', () => {
  it('should evaluate condition rules correctly', () => {
    const conditions = [
      { field: 'opportunity.amount', operator: '>=', value: 50000000 },
      { field: 'opportunity.status', operator: '=', value: 'OPEN' },
    ];

    const matchingData = {
      opportunity: { amount: 60000000, status: 'OPEN' },
    };

    const nonMatchingData = {
      opportunity: { amount: 30000000, status: 'OPEN' },
    };

    expect(ConditionEvaluator.evaluateConditions(conditions, matchingData)).toBe(true);
    expect(ConditionEvaluator.evaluateConditions(conditions, nonMatchingData)).toBe(false);
  });

  it('should generate consistent SHA256 idempotency key', () => {
    const key1 = IdempotencyGuard.generateKey(1, 'evt_123', 'LEAD', 10);
    const key2 = IdempotencyGuard.generateKey(1, 'evt_123', 'LEAD', 10);
    const key3 = IdempotencyGuard.generateKey(1, 'evt_456', 'LEAD', 10);

    expect(key1).toBe(key2);
    expect(key1).not.toBe(key3);
  });
});
