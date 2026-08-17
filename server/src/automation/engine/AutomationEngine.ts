import prisma from '../../config/database';
import { ConditionEvaluator } from './ConditionEvaluator';
import { ActionExecutor } from './ActionExecutor';
import { IdempotencyGuard } from './IdempotencyGuard';

export class AutomationEngine {
  public static async processEvent(
    eventId: string,
    eventType: string,
    entityType: string,
    entityId: number | bigint,
    payload: Record<string, any>
  ): Promise<any[]> {
    console.log(`[AutomationEngine] Processing Event ${eventType} for ${entityType} #${entityId}`);

    const triggerEventsToMatch = [eventType];
    if (eventType === 'LEAD_CREATED') triggerEventsToMatch.push('RECORD_CREATED');
    if (eventType === 'RECORD_CREATED') triggerEventsToMatch.push('LEAD_CREATED');

    // 1. Find matching triggers and active automations
    const triggers = await prisma.automationTrigger.findMany({
      where: {
        triggerEvent: { in: triggerEventsToMatch },
        entityType: entityType,
        automation: {
          isActive: true,
          deletedAt: null,
        },
      },
      include: {
        automation: {
          include: {
            conditions: { orderBy: { orderNo: 'asc' } },
            actions: { orderBy: { stepOrder: 'asc' } },
          },
        },
      },
    });

    if (!triggers || triggers.length === 0) {
      console.log(`[AutomationEngine] No automation rules matched for ${eventType}:${entityType}`);
      return [];
    }

    const results = [];

    for (const trigger of triggers) {
      const automation = trigger.automation;
      
      // Filter trigger config (e.g. status filter)
      if (trigger.config) {
        const triggerConfig = typeof trigger.config === 'string' ? JSON.parse(trigger.config) : trigger.config;
        if (triggerConfig.to_status && payload.status && triggerConfig.to_status !== payload.status) {
          continue;
        }
        if (triggerConfig.to_stage_code && payload.stage_code && triggerConfig.to_stage_code !== payload.stage_code) {
          continue;
        }
      }

      // 2. Generate idempotency key
      const idempotencyKey = IdempotencyGuard.generateKey(
        automation.id,
        eventId,
        entityType,
        entityId
      );

      // Check if execution already exists
      const existingExecution = await prisma.automationExecution.findUnique({
        where: { idempotencyKey },
      });

      if (existingExecution) {
        console.log(`[AutomationEngine] Duplicate execution skipped by idempotency key: ${idempotencyKey}`);
        results.push({ executionId: existingExecution.id, status: 'SKIPPED_DUPLICATE' });
        continue;
      }

      // 3. Create execution record in PENDING state
      let execution;
      try {
        execution = await prisma.automationExecution.create({
          data: {
            automationId: automation.id,
            triggerId: trigger.id,
            eventId,
            entityType,
            entityId: BigInt(entityId),
            idempotencyKey,
            status: 'RUNNING',
            startedAt: new Date(),
          },
        });
      } catch (err: any) {
        if (err.code === 'P2002') { // Unique constraint violation
          console.log(`[AutomationEngine] Execution already locked for ${idempotencyKey}`);
          continue;
        }
        throw err;
      }

      // 4. Evaluate Conditions
      const conditionRules = automation.conditions.map((c) => ({
        field: c.field || undefined,
        operator: c.operator || undefined,
        value: c.value,
        logicOperator: c.logicOperator,
      }));

      const isConditionMet = ConditionEvaluator.evaluateConditions(conditionRules, payload);

      if (!isConditionMet) {
        await prisma.automationExecution.update({
          where: { id: execution.id },
          data: {
            status: 'SKIPPED',
            completedAt: new Date(),
            errorMessage: 'Conditions not satisfied',
          },
        });
        results.push({ executionId: execution.id, status: 'SKIPPED' });
        continue;
      }

      // 5. Execute Actions
      let hasError = false;
      let lastErrorMessage = null;

      for (let i = 0; i < automation.actions.length; i++) {
        const action = automation.actions[i];
        const stepNo = i + 1;

        try {
          const actionResult = await ActionExecutor.executeAction(
            { type: action.actionType, config: action.config as any, stepOrder: action.stepOrder },
            entityType,
            entityId,
            payload
          );

          if (actionResult && actionResult.ownerId) {
            payload.owner_id = actionResult.ownerId;
          }

          await prisma.automationExecutionLog.create({
            data: {
              executionId: execution.id,
              stepNo,
              actionType: action.actionType,
              status: 'SUCCESS',
              inputPayload: JSON.stringify(action.config),
              outputPayload: JSON.stringify(actionResult),
            },
          });
        } catch (actionErr: any) {
          hasError = true;
          lastErrorMessage = actionErr.message || 'Action execution error';

          await prisma.automationExecutionLog.create({
            data: {
              executionId: execution.id,
              stepNo,
              actionType: action.actionType,
              status: 'FAILED',
              inputPayload: JSON.stringify(action.config),
              errorMessage: lastErrorMessage,
            },
          });

          break; // Stop executing subsequent steps on failure
        }
      }

      // 6. Update Execution Status
      const finalStatus = hasError ? 'FAILED' : 'SUCCESS';
      await prisma.automationExecution.update({
        where: { id: execution.id },
        data: {
          status: finalStatus,
          completedAt: new Date(),
          errorMessage: lastErrorMessage,
        },
      });

      results.push({ executionId: execution.id, status: finalStatus });
    }

    return results;
  }
}
