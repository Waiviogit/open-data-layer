import { INSTACART_PRODUCT_ID_TYPE } from './instacart.constants';

export function isInstacartProductIdType(type: string): boolean {
  return type.trim().toLowerCase() === INSTACART_PRODUCT_ID_TYPE;
}

export function hasInstacartIdentifier(fields: Record<string, unknown>): boolean {
  const raw = fields.identifier;
  if (!Array.isArray(raw)) {
    return false;
  }
  for (const item of raw) {
    if (item == null || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const type = (item as { type?: unknown }).type;
    if (typeof type === 'string' && isInstacartProductIdType(type)) {
      return true;
    }
  }
  return false;
}
