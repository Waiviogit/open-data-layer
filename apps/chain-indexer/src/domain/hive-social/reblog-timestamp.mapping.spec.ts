import { blockTimestampToUnixSeconds } from '@opden-data-layer/core';
import {
  earlierRebloggedAtUnix,
  isHiveBlogReblogEntry,
  shouldOverwriteRebloggedAtUnix,
} from '@opden-data-layer/clients';

describe('reblog timestamp backfill mapping', () => {
  it('filters own-post blog entries', () => {
    expect(isHiveBlogReblogEntry('grampo', { author: 'grampo' })).toBe(false);
    expect(isHiveBlogReblogEntry('grampo', { author: 'cryptodive' })).toBe(true);
  });

  it('skips sub-60s deltas', () => {
    expect(shouldOverwriteRebloggedAtUnix(1_690_000_003, 1_690_000_000)).toBe(
      false,
    );
    expect(shouldOverwriteRebloggedAtUnix(1_690_000_061, 1_690_000_000)).toBe(
      true,
    );
  });

  it('parses reblogged_on as UTC when Hive omits Z', () => {
    expect(blockTimestampToUnixSeconds('2023-10-23T23:46:06')).toBe(
      Math.floor(Date.parse('2023-10-23T23:46:06Z') / 1000),
    );
  });

  it('LEAST keeps the earlier timestamp', () => {
    const existing = Math.floor(Date.parse('2026-07-24T08:35:05Z') / 1000);
    const incoming = Math.floor(Date.parse('2023-10-23T23:46:06Z') / 1000);
    expect(earlierRebloggedAtUnix(existing, incoming)).toBe(incoming);
  });
});
