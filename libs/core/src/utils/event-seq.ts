/**
 * Packed canonical ordering for Hive blockchain events.
 *
 * Layout (BIGINT, 58 bits used of 64):
 *   block_num      32 bits  [0 .. 4,294,967,295]  ~130+ years of 3s blocks
 *   trx_index      10 bits  [0 .. 1,023]
 *   op_index         8 bits  [0 .. 255]
 *   odl_event_index  8 bits  [0 .. 255]
 *
 * event_seq = block_num * TRX_MULT + trx_index * OP_MULT + op_index * ODL_MULT + odl_event_index
 *
 * A single numeric comparison replaces multi-column ORDER BY.
 */

const ODL_BITS = 8;
const OP_BITS = 8;
const TRX_BITS = 10;

const ODL_MULT = 1;
const OP_MULT = 1 << ODL_BITS; // 256
const TRX_MULT = 1 << (ODL_BITS + OP_BITS); // 65_536
const BLOCK_MULT = 1 << (ODL_BITS + OP_BITS + TRX_BITS); // 67_108_864

/** Use `2 ** 32`; `(1 << 32)` is `1` in JS (shift count masked), not 2^32. */
const MAX_BLOCK_NUM = 2 ** 32 - 1; // 4_294_967_295
const MAX_TRX_INDEX = (1 << TRX_BITS) - 1; // 1_023
const MAX_OP_INDEX = (1 << OP_BITS) - 1; // 255
const MAX_ODL_EVENT_INDEX = (1 << ODL_BITS) - 1; // 255

export interface EventSeqComponents {
  blockNum: number;
  trxIndex: number;
  opIndex: number;
  odlEventIndex: number;
}

export function encodeEventSeq({
  blockNum,
  trxIndex,
  opIndex,
  odlEventIndex,
}: EventSeqComponents): bigint {
  if (
    blockNum < 0 ||
    blockNum > MAX_BLOCK_NUM ||
    trxIndex < 0 ||
    trxIndex > MAX_TRX_INDEX ||
    opIndex < 0 ||
    opIndex > MAX_OP_INDEX ||
    odlEventIndex < 0 ||
    odlEventIndex > MAX_ODL_EVENT_INDEX
  ) {
    throw new RangeError(
      `event_seq components out of range: blockNum=${blockNum} trxIndex=${trxIndex} opIndex=${opIndex} odlEventIndex=${odlEventIndex}`
    );
  }
  return (
    BigInt(blockNum) * BigInt(BLOCK_MULT) +
    BigInt(trxIndex) * BigInt(TRX_MULT) +
    BigInt(opIndex) * BigInt(OP_MULT) +
    BigInt(odlEventIndex) * BigInt(ODL_MULT)
  );
}

export function decodeEventSeq(eventSeq: bigint): EventSeqComponents {
  const n = Number(eventSeq);
  const odlEventIndex = n & MAX_ODL_EVENT_INDEX;
  const opIndex = (n >>> ODL_BITS) & MAX_OP_INDEX;
  const trxIndex = (n >>> (ODL_BITS + OP_BITS)) & MAX_TRX_INDEX;
  const blockNum = Math.trunc(n / BLOCK_MULT);
  return { blockNum, trxIndex, opIndex, odlEventIndex };
}

export const EVENT_SEQ_LIMITS = {
  MAX_BLOCK_NUM,
  MAX_TRX_INDEX,
  MAX_OP_INDEX,
  MAX_ODL_EVENT_INDEX,
} as const;
