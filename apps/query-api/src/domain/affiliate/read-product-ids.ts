import { UPDATE_TYPES } from '@opden-data-layer/core';
import type { AffiliateProductId } from './affiliate.types';

export function readProductIds(fields: Record<string, unknown>): AffiliateProductId[] {
  const raw = fields[UPDATE_TYPES.IDENTIFIER];
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: AffiliateProductId[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const row = item as Record<string, unknown>;
    const productId = typeof row.value === 'string' ? row.value.trim() : '';
    const productIdType = typeof row.type === 'string' ? row.type.trim() : '';
    if (!productId || !productIdType) {
      continue;
    }
    out.push({ productId, productIdType });
  }
  return out;
}
