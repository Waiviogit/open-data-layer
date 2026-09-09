import { utf8ByteLength } from '@opden-data-layer/hive-broadcast';

import { computeObjectCreateBroadcastMeta } from './broadcast-size';

describe('computeObjectCreateBroadcastMeta', () => {
  it('returns per-op byte lengths and total bytes', () => {
    const ops = [{ json: '{"a":1}' }, { json: '{"b":22}' }];
    const meta = computeObjectCreateBroadcastMeta(ops, []);

    expect(meta.perOpBytes).toEqual(ops.map((op) => utf8ByteLength(op.json)));
    expect(meta.bytes).toBe(meta.perOpBytes.reduce((a, b) => a + b, 0));
    expect(meta.opsCount).toBe(2);
    expect(meta.suggestIpfsBatch).toBe(false);
  });

  it('warns when ops count is near transaction limit', () => {
    const ops = Array.from({ length: 4 }, () => ({ json: '{}' }));
    const meta = computeObjectCreateBroadcastMeta(ops, []);

    expect(meta.suggestIpfsBatch).toBe(true);
    expect(meta.warnings.some((w) => w.includes('4 custom_json ops'))).toBe(
      true,
    );
  });

  it('warns when a single op exceeds per-op size threshold', () => {
    const largeJson = JSON.stringify({ events: [{ x: 'y'.repeat(7_000) }] });
    const meta = computeObjectCreateBroadcastMeta([{ json: largeJson }], []);

    expect(meta.suggestIpfsBatch).toBe(true);
    expect(meta.warnings.some((w) => w.includes('6000 bytes'))).toBe(true);
  });

  it('preserves existing warnings from envelope build', () => {
    const meta = computeObjectCreateBroadcastMeta(
      [{ json: '{}' }],
      ['Skipped unsupported update "foo"'],
    );

    expect(meta.warnings).toContain('Skipped unsupported update "foo"');
  });
});
