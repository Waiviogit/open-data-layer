import * as hp from './hive-permlink';

describe('sanitizeHivePermlink', () => {
  it('lowercases and keeps only a-z0-9- (underscores removed)', () => {
    expect(hp.sanitizeHivePermlink('Hello-World!!!')).toBe('hello-world');
  });

  it('collapses repeated hyphens and trims edges', () => {
    expect(hp.sanitizeHivePermlink('--a--b--')).toBe('a-b');
  });

  it('truncates to max length', () => {
    const long = 'a'.repeat(hp.HIVE_PERMLINK_MAX_LENGTH + 40);
    expect(hp.sanitizeHivePermlink(long).length).toBeLessThanOrEqual(hp.HIVE_PERMLINK_MAX_LENGTH);
  });
});

describe('stripCommentParentPermlinkSuffix', () => {
  it('removes Hive-style date suffix from parent permlink', () => {
    expect(hp.stripCommentParentPermlinkSuffix('my-post-20231225t123456789z')).toBe('my-post');
  });
});

describe('createCommentPermlink', () => {
  it('matches legacy re-parent-time shape with fixed clock', () => {
    const now = new Date('2025-04-10T15:30:00.000Z');
    const p = hp.createCommentPermlink('alice', 'some-post', now);
    expect(p.startsWith('re-alice-some-post-')).toBe(true);
    expect(p).toContain('20250410t153000000z');
    expect(p).toMatch(/^[a-z0-9-]+$/);
  });

  it('strips date suffix from parent permlink before composing', () => {
    const now = new Date('2025-04-10T15:30:00.000Z');
    const p = hp.createCommentPermlink('alice', 'thread-20200101t000000000z', now);
    expect(p).toContain('re-alice-thread-');
  });
});

describe('createRootPostPermlinkFromParents', () => {
  it('delegates to same formula as comment permlink', () => {
    const now = new Date('2025-04-10T15:30:00.000Z');
    expect(hp.createRootPostPermlinkFromParents('bob', 'parent-pl', now)).toBe(
      hp.createCommentPermlink('bob', 'parent-pl', now),
    );
  });
});

describe('titleToPostSlug', () => {
  it('produces ascii slug from latin title', () => {
    expect(hp.titleToPostSlug('  Hello World  ')).toBe('hello-world');
  });

  it('returns empty when no ascii letters or digits', () => {
    expect(hp.titleToPostSlug('你好')).toBe('');
  });

  it('respects max slug length', () => {
    const long = 'x'.repeat(hp.HIVE_POST_TITLE_SLUG_MAX + 50);
    expect(hp.titleToPostSlug(long).length).toBeLessThanOrEqual(hp.HIVE_POST_TITLE_SLUG_MAX);
  });
});

describe('createRootPostPermlink', () => {
  it('uses slug from title for normal author', () => {
    const p = hp.createRootPostPermlink({
      title: 'My First Post',
      author: 'alice',
    });
    expect(p).toBe('my-first-post');
  });

  it('throws when title is empty', () => {
    expect(() =>
      hp.createRootPostPermlink({
        title: '   ',
        author: 'alice',
      }),
    ).toThrow(/createRootPostPermlinkFromParents/);
  });
});

describe('createUniqueRootPostPermlink', () => {
  it('returns first candidate when not taken', async () => {
    const exists = jest.fn().mockResolvedValue(false);
    const p = await hp.createUniqueRootPostPermlink(
      { title: 'Unique Title', author: 'bob' },
      { exists },
    );
    expect(p).toBe('unique-title');
    expect(exists).toHaveBeenCalledWith('bob', 'unique-title');
  });

  it('retries with base58 prefix when taken', async () => {
    const exists = jest
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const p = await hp.createUniqueRootPostPermlink(
      { title: 'Dup', author: 'carol' },
      { exists },
    );
    expect(exists).toHaveBeenCalledTimes(2);
    expect(exists).toHaveBeenNthCalledWith(1, 'carol', 'dup');
    expect(p.endsWith('-dup')).toBe(true);
    expect(p).not.toBe('dup');
  });
});

describe('randomBase58String', () => {
  it('returns non-empty string', () => {
    expect(hp.randomBase58String(4).length).toBeGreaterThan(0);
  });
});
