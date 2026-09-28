import { hiveUpdateExplorerHref, parseLegacyUpdatePostRef } from './legacy-update-tx';

const BASE = 'https://hiveblockexplorer.com/tx';

describe('parseLegacyUpdatePostRef', () => {
  it('parses legacy_author_permlink', () => {
    expect(parseLegacyUpdatePostRef('legacy_waivio.updates09_pacificgifts-ruv7l520zt')).toEqual({
      author: 'waivio.updates09',
      permlink: 'pacificgifts-ruv7l520zt',
    });
  });

  it('keeps underscores inside the permlink', () => {
    expect(parseLegacyUpdatePostRef('legacy_alice_my_post')).toEqual({
      author: 'alice',
      permlink: 'my_post',
    });
  });

  it('returns null for a hive transaction id', () => {
    expect(parseLegacyUpdatePostRef('50ee58ea610f3b5d840da2c176ecc972835beae4')).toBeNull();
  });

  it('returns null when the author segment is not a hive account', () => {
    expect(parseLegacyUpdatePostRef('legacy_000000000000000000000000_alice_post_bob')).toBeNull();
    expect(parseLegacyUpdatePostRef('legacy_')).toBeNull();
    expect(parseLegacyUpdatePostRef('legacy_ab')).toBeNull();
  });
});

describe('hiveUpdateExplorerHref', () => {
  it('links a legacy update to the explorer post page', () => {
    expect(
      hiveUpdateExplorerHref(BASE, 'legacy_waivio.updates09_pacificgifts-ruv7l520zt'),
    ).toBe('https://hiveblockexplorer.com/@waivio.updates09/pacificgifts-ruv7l520zt');
  });

  it('links a normal tx id to /tx/{id}', () => {
    expect(hiveUpdateExplorerHref(BASE, 'tx1')).toBe('https://hiveblockexplorer.com/tx/tx1');
  });

  it('falls back to /tx/ for an unparseable legacy id', () => {
    expect(hiveUpdateExplorerHref(BASE, 'legacy_000000000000000000000000_alice_post')).toBe(
      'https://hiveblockexplorer.com/tx/legacy_000000000000000000000000_alice_post',
    );
  });

  it('returns null for a blank id', () => {
    expect(hiveUpdateExplorerHref(BASE, '  ')).toBeNull();
  });
});
