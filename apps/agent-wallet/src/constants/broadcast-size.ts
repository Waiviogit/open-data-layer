import {
  HIVE_CUSTOM_OP_DATA_MAX_LENGTH,
  OBJECT_CREATE_MAX_OPS_PER_TRX,
  utf8ByteLength,
} from '@opden-data-layer/hive-broadcast';

/** Warn when direct chain create approaches max ops per transaction (matches web dock). */
export const BROADCAST_WARN_OPS_COUNT = 4;

/** Per-op JSON size above which HAS signing often times out before Hive rejects. */
export const BROADCAST_WARN_PER_OP_BYTES = 6_000;

export type ObjectCreateBroadcastMeta = {
  perOpBytes: number[];
  bytes: number;
  opsCount: number;
  warnings: string[];
  suggestIpfsBatch: boolean;
};

export function computeObjectCreateBroadcastMeta(
  ops: readonly { json: string }[],
  existingWarnings: readonly string[],
): ObjectCreateBroadcastMeta {
  const perOpBytes = ops.map((op) => utf8ByteLength(op.json));
  const bytes = perOpBytes.reduce((sum, n) => sum + n, 0);
  const opsCount = ops.length;
  const warnings = [...existingWarnings];
  let suggestIpfsBatch = false;

  if (opsCount >= BROADCAST_WARN_OPS_COUNT) {
    warnings.push(
      `Object create uses ${opsCount} custom_json ops (max ${OBJECT_CREATE_MAX_OPS_PER_TRX} per transaction); consider IPFS batch import.`,
    );
    suggestIpfsBatch = true;
  }

  if (perOpBytes.some((n) => n > BROADCAST_WARN_PER_OP_BYTES)) {
    warnings.push(
      `One or more ops exceed ${BROADCAST_WARN_PER_OP_BYTES} bytes (Hive limit ${HIVE_CUSTOM_OP_DATA_MAX_LENGTH}); large payloads may cause HAS sign timeout.`,
    );
    suggestIpfsBatch = true;
  }

  return {
    perOpBytes,
    bytes,
    opsCount,
    warnings,
    suggestIpfsBatch,
  };
}
