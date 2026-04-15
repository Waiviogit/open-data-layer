import {
  extractHashtagObjectIdsFromBody,
  extractObjectIdsFromCommentBody,
  extractObjectPathSlugsFromBody,
} from './comment-post-object-candidates';

describe('comment-post-object-candidates', () => {
  it('extracts hashtag tokens without #', () => {
    expect(extractHashtagObjectIdsFromBody('Hello #foo and #bar-baz')).toEqual([
      'foo',
      'bar-baz',
    ]);
  });

  it('extracts /object/slug from plain text and URLs', () => {
    const body = 'x /object/slug1 y https://www.waivio.com/@a/object/slug2';
    expect(extractObjectPathSlugsFromBody(body).sort()).toEqual([
      'slug1',
      'slug2',
    ]);
  });

  it('dedupes extractObjectIdsFromCommentBody', () => {
    const body = '#dup /object/dup';
    expect(extractObjectIdsFromCommentBody(body)).toEqual(['dup']);
  });

  it('returns empty for empty body', () => {
    expect(extractObjectIdsFromCommentBody('')).toEqual([]);
  });
});
