import { OBJECT_TYPES, parseOblUsdAmount, type OblUsdAmountKind } from '@opden-data-layer/core';
import type { JsonValue, OblDisputeRule } from '@opden-data-layer/odl-db-types';

export function asJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

export function normalizePair(a: string, b: string): { pairLow: string; pairHigh: string } {
  const x = a.trim();
  const y = b.trim();
  return x <= y ? { pairLow: x, pairHigh: y } : { pairLow: y, pairHigh: x };
}

export function toUsdString(value: number | string, kind: OblUsdAmountKind = 'nonnegative'): string {
  const parsed = parseOblUsdAmount(value, kind);
  if (!parsed) {
    throw new Error('invalid amount_usd');
  }
  return parsed;
}

export function isServiceRefType(objectType: string, kind: 'offer' | 'request'): boolean {
  if (kind === 'offer') {
    return objectType === OBJECT_TYPES.SERVICE_OFFERED;
  }
  return objectType === OBJECT_TYPES.SERVICE_REQUESTED;
}

export function isLegalRefType(objectType: string): boolean {
  return objectType === OBJECT_TYPES.LEGAL_DOCUMENT;
}

export function authorizedDisputeResolver(contract: {
  dispute_rule: OblDisputeRule;
  arbiter: string | null;
  provider: string;
  client: string;
} | null): string | null {
  if (!contract) {
    return null;
  }
  if (contract.dispute_rule === 'client') {
    return contract.client;
  }
  if (contract.dispute_rule === 'provider') {
    return contract.provider;
  }
  return contract.arbiter;
}

export function sumUsdAmounts(amounts: readonly string[]): string {
  const total = amounts.reduce((sum, amount) => sum + Number(amount), 0);
  return total.toFixed(8);
}
