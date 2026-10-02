import {
  clampHiveBlogEntriesLimit,
  clampHiveBlogEntriesStart,
  earlierRebloggedAtUnix,
  isHiveBlogReblogEntry,
  nextHiveBlogEntriesStart,
  shouldOverwriteRebloggedAtUnix,
} from './blog-entries';

describe('clampHiveBlogEntriesLimit', () => {
  it('clamps to 1 when limit is not a positive integer', () => {
    expect(clampHiveBlogEntriesLimit(0)).toBe(1);
    expect(clampHiveBlogEntriesLimit(-4)).toBe(1);
    expect(clampHiveBlogEntriesLimit(Number.NaN)).toBe(1);
  });

  it('clamps to 500 (Hive assert ceiling)', () => {
    expect(clampHiveBlogEntriesLimit(501)).toBe(500);
    expect(clampHiveBlogEntriesLimit(500)).toBe(500);
  });

  it('floors a valid in-range value', () => {
    expect(clampHiveBlogEntriesLimit(20.9)).toBe(20);
  });
});

describe('clampHiveBlogEntriesStart', () => {
  it('treats negative or non-finite as 0 (newest)', () => {
    expect(clampHiveBlogEntriesStart(-1)).toBe(0);
    expect(clampHiveBlogEntriesStart(Number.NaN)).toBe(0);
  });

  it('floors a valid start entry_id', () => {
    expect(clampHiveBlogEntriesStart(153.7)).toBe(153);
  });
});

describe('nextHiveBlogEntriesStart', () => {
  it('returns lastEntryId - 1 when the page is full and not at 0', () => {
    expect(nextHiveBlogEntriesStart(134, 20, 20)).toBe(133);
  });

  it('stops when last entry_id is 0 or the page is short', () => {
    expect(nextHiveBlogEntriesStart(0, 20, 20)).toBeNull();
    expect(nextHiveBlogEntriesStart(10, 4, 20)).toBeNull();
    expect(nextHiveBlogEntriesStart(10, 0, 20)).toBeNull();
  });
});

describe('isHiveBlogReblogEntry', () => {
  it('drops own-post blog rows regardless of Hive 1970 sentinel', () => {
    expect(
      isHiveBlogReblogEntry('grampo', { author: 'grampo' }),
    ).toBe(false);
    expect(
      isHiveBlogReblogEntry('Grampo', { author: 'grampo' }),
    ).toBe(false);
  });

  it('keeps entries authored by someone else', () => {
    expect(
      isHiveBlogReblogEntry('grampo', { author: 'cryptodive' }),
    ).toBe(true);
  });
});

describe('shouldOverwriteRebloggedAtUnix', () => {
  it('skips live-indexer rows within 60s of Hive', () => {
    expect(shouldOverwriteRebloggedAtUnix(1_690_000_003, 1_690_000_000)).toBe(
      false,
    );
  });

  it('writes when the fabricated migrator time is far off', () => {
    expect(shouldOverwriteRebloggedAtUnix(1_753_526_105, 1_698_104_766)).toBe(
      true,
    );
  });
});

describe('earlierRebloggedAtUnix', () => {
  it('heals a 2026-07-24 migrator stamp with the 2023-10-23 chain time', () => {
    const existing = Math.floor(Date.parse('2026-07-24T08:35:05Z') / 1000);
    const incoming = Math.floor(Date.parse('2023-10-23T23:46:06Z') / 1000);
    expect(earlierRebloggedAtUnix(existing, incoming)).toBe(incoming);
  });
});
