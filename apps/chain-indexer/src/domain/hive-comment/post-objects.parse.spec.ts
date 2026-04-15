import { MAX_POST_OBJECTS_PER_POST } from '../../constants/post-objects';
import {
  bindPostObjectsToPost,
  parsePostObjectsForInsert,
  validateWobjectPercentSum,
} from './post-objects.parse';

describe('post-objects.parse', () => {
  it('validateWobjectPercentSum allows empty', () => {
    expect(validateWobjectPercentSum([])).toBe(true);
  });

  it('validateWobjectPercentSum rejects sum > 101', () => {
    const rows = [
      {
        author: 'a',
        permlink: 'p',
        object_id: 'x',
        percent: 60,
        object_type: null,
      },
      {
        author: 'a',
        permlink: 'p',
        object_id: 'y',
        percent: 50,
        object_type: null,
      },
    ] as Parameters<typeof validateWobjectPercentSum>[0];
    expect(validateWobjectPercentSum(rows)).toBe(false);
  });

  it('reads metadata.objects with object_id and percent', () => {
    const meta = {
      objects: [{ object_id: 'a/b', percent: 25 }],
    };
    expect(parsePostObjectsForInsert(meta, '')).toEqual([
      expect.objectContaining({
        object_id: 'a/b',
        percent: 25,
        object_type: null,
      }),
    ]);
  });

  it('accepts author_permlink as object id in metadata.objects (legacy)', () => {
    const meta = {
      objects: [{ author_permlink: 'legacy/id', percent: 10 }],
    };
    expect(parsePostObjectsForInsert(meta, '').map((r) => r.object_id)).toEqual([
      'legacy/id',
    ]);
  });

  it('maps each tags string to percent 0', () => {
    const meta = { tags: ['  tag-one ', 'tag-two'] };
    const ids = parsePostObjectsForInsert(meta, '').map((r) => r.object_id).sort();
    expect(ids).toEqual(['tag-one', 'tag-two']);
    expect(parsePostObjectsForInsert(meta, '').every((r) => r.percent === 0)).toBe(true);
  });

  it('maps body hashtags to percent 0 and lets objects override', () => {
    const meta = {
      tags: ['x'],
      objects: [{ object_id: 'x', percent: 50 }],
    };
    const parsed = parsePostObjectsForInsert(meta, 'Hello #y /object/z');
    const byId = Object.fromEntries(parsed.map((r) => [r.object_id, r.percent]));
    expect(byId['x']).toBe(50);
    expect(byId['y']).toBe(0);
    expect(byId['z']).toBe(0);
  });

  it('adds body /object/slug paths at percent 0', () => {
    const parsed = parsePostObjectsForInsert(null, 'See /object/slug-from-body');
    expect(parsed.map((r) => r.object_id)).toEqual(['slug-from-body']);
    expect(parsed[0]?.percent).toBe(0);
  });

  it('lets metadata.objects override tags and body for same object_id', () => {
    const meta = {
      tags: ['dup'],
      objects: [{ object_id: 'dup', percent: 40 }],
    };
    const parsed = parsePostObjectsForInsert(meta, 'x /object/dup y');
    expect(parsed).toEqual([
      expect.objectContaining({ object_id: 'dup', percent: 40 }),
    ]);
  });

  it(`keeps at most MAX_POST_OBJECTS_PER_POST (${MAX_POST_OBJECTS_PER_POST}) objects`, () => {
    const tags = Array.from({ length: MAX_POST_OBJECTS_PER_POST + 1 }, (_, i) => `t${i}`);
    const parsed = parsePostObjectsForInsert({ tags }, '');
    expect(parsed).toHaveLength(MAX_POST_OBJECTS_PER_POST);
  });

  it('bindPostObjectsToPost sets author and permlink', () => {
    const bound = bindPostObjectsToPost(
      [
        {
          author: '',
          permlink: '',
          object_id: 'x',
          percent: 0,
          object_type: null,
        },
      ],
      'alice',
      'post-1',
    );
    expect(bound[0]).toMatchObject({
      author: 'alice',
      permlink: 'post-1',
      object_id: 'x',
    });
  });
});
