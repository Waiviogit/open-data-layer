import { HIVE_CUSTOM_OP_DATA_MAX_LENGTH } from './constants';

/** UTF-8 byte length of a string (Hive `custom_json.json` is UTF-8). */
export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

/**
 * Returns true when `json` exceeds the Hive on-chain limit for a single
 * `custom_json` operation payload (`HIVE_CUSTOM_OP_DATA_MAX_LENGTH`, 8192 bytes).
 */
export function exceedsHiveCustomJsonLimit(json: string): boolean {
  return utf8ByteLength(json) > HIVE_CUSTOM_OP_DATA_MAX_LENGTH;
}
