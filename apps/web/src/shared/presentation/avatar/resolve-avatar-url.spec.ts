import { resolveAvatarUrl } from './resolve-avatar-url';

describe('resolveAvatarUrl', () => {
  it('returns explicit avatarUrl when non-empty', () => {
    expect(
      resolveAvatarUrl({
        username: 'alice',
        avatarUrl: 'https://example.com/a.png',
        size: 40,
      }),
    ).toBe('https://example.com/a.png');
  });

  it('trims avatarUrl', () => {
    expect(
      resolveAvatarUrl({
        username: 'alice',
        avatarUrl: '  https://example.com/a.png  ',
        size: 40,
      }),
    ).toBe('https://example.com/a.png');
  });

  it('uses Hive small when size <= 64 and no avatarUrl', () => {
    expect(
      resolveAvatarUrl({
        username: 'bob',
        avatarUrl: null,
        size: 40,
      }),
    ).toBe('https://images.hive.blog/u/bob/avatar/small');
  });

  it('uses Hive large when size > 64 and no avatarUrl', () => {
    expect(
      resolveAvatarUrl({
        username: 'bob',
        avatarUrl: undefined,
        size: 96,
      }),
    ).toBe('https://images.hive.blog/u/bob/avatar/large');
  });

  it('returns null when username empty and no avatarUrl', () => {
    expect(
      resolveAvatarUrl({
        username: '   ',
        avatarUrl: null,
        size: 40,
      }),
    ).toBeNull();
  });

  it('falls through to Hive when avatarUrl is whitespace-only', () => {
    expect(
      resolveAvatarUrl({
        username: 'carol',
        avatarUrl: '   ',
        size: 40,
      }),
    ).toBe('https://images.hive.blog/u/carol/avatar/small');
  });
});
