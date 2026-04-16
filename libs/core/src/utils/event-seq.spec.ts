import { decodeEventSeq, encodeEventSeq, EVENT_SEQ_LIMITS } from './event-seq';

describe('event-seq', () => {
  it('MAX_BLOCK_NUM is full 32-bit range (not broken by (1 << 32) JS semantics)', () => {
    // (1 << 32) is 1 in JS (shift count masked to 0), so (1 << 32) - 1 was 0 and rejected all real blocks.
    expect(EVENT_SEQ_LIMITS.MAX_BLOCK_NUM).toBe(4_294_967_295);
  });

  it('encodeEventSeq accepts typical Hive block numbers', () => {
    const seq = encodeEventSeq({
      blockNum: 102_138_605,
      trxIndex: 0,
      opIndex: 0,
      odlEventIndex: 0,
    });
    expect(seq > BigInt(0)).toBe(true);
    expect(decodeEventSeq(seq).blockNum).toBe(102_138_605);
  });

  it('encodeEventSeq rejects blockNum above MAX_BLOCK_NUM', () => {
    expect(() =>
      encodeEventSeq({
        blockNum: 4_294_967_296,
        trxIndex: 0,
        opIndex: 0,
        odlEventIndex: 0,
      }),
    ).toThrow(RangeError);
  });
});
