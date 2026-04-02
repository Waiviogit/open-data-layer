import type { MongoId } from './types';

/** Extract hex string from Mongo extended JSON or plain string id. */
export function mongoIdToString(id: MongoId | undefined): string | null {
  if (id == null) {
    return null;
  }
  if (typeof id === 'string') {
    return id;
  }
  if (typeof id === 'object' && '$oid' in id && typeof id.$oid === 'string') {
    return id.$oid;
  }
  return null;
}

/**
 * MongoDB ObjectId first 4 bytes (8 hex chars) are seconds since Unix epoch.
 */
export function createdAtUnixFromObjectId(oidHex: string): number {
  if (oidHex.length < 8) {
    return 0;
  }
  const secondsHex = oidHex.slice(0, 8);
  const parsed = Number.parseInt(secondsHex, 16);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Convert a camelCase identifier to snake_case (ASCII). */
export function camelToSnake(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [k: string]: JsonValue };

/** Recursively rename object keys from camelCase to snake_case. */
export function keysCamelToSnake(value: JsonValue): JsonValue {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => keysCamelToSnake(item));
  }
  const out: { [k: string]: JsonValue } = {};
  for (const [k, v] of Object.entries(value)) {
    out[camelToSnake(k)] = keysCamelToSnake(v as JsonValue);
  }
  return out;
}
