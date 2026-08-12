export interface ConditionRule {
  field?: string;
  operator?: string;
  value?: any;
  logicOperator?: string;
  children?: ConditionRule[];
}

export class ConditionEvaluator {
  /**
   * Evaluates condition rules against entity payload
   */
  public static evaluateConditions(
    conditions: ConditionRule[],
    entityData: Record<string, any>
  ): boolean {
    if (!conditions || conditions.length === 0) return true;

    for (const rule of conditions) {
      const isMatch = this.evaluateRule(rule, entityData);
      if (!isMatch) return false; // Default AND logic across root conditions
    }

    return true;
  }

  private static evaluateRule(rule: ConditionRule, entityData: Record<string, any>): boolean {
    if (rule.children && rule.children.length > 0) {
      const isAnd = (rule.logicOperator || 'AND').toUpperCase() === 'AND';
      if (isAnd) {
        return rule.children.every((child) => this.evaluateRule(child, entityData));
      } else {
        return rule.children.some((child) => this.evaluateRule(child, entityData));
      }
    }

    if (!rule.field || !rule.operator) return true;

    const actualValue = this.getNestedFieldValue(entityData, rule.field);
    const targetValue = rule.value;

    switch (rule.operator) {
      case '=':
      case 'EQUALS':
        return String(actualValue) === String(targetValue);
      case '!=':
      case 'NOT_EQUALS':
        return String(actualValue) !== String(targetValue);
      case '>':
        return Number(actualValue) > Number(targetValue);
      case '>=':
        return Number(actualValue) >= Number(targetValue);
      case '<':
        return Number(actualValue) < Number(targetValue);
      case '<=':
        return Number(actualValue) <= Number(targetValue);
      case 'IN':
        return Array.isArray(targetValue)
          ? targetValue.includes(actualValue)
          : String(targetValue).split(',').includes(String(actualValue));
      case 'NOT_IN':
        return Array.isArray(targetValue)
          ? !targetValue.includes(actualValue)
          : !String(targetValue).split(',').includes(String(actualValue));
      case 'CONTAINS':
        return String(actualValue || '').toLowerCase().includes(String(targetValue || '').toLowerCase());
      case 'IS_NULL':
        return actualValue === null || actualValue === undefined;
      case 'IS_NOT_NULL':
        return actualValue !== null && actualValue !== undefined;
      default:
        return true;
    }
  }

  private static getNestedFieldValue(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  }
}
