import { buildDiscoverHref, parseDiscoverTagsParam } from './discover-url';

describe('buildDiscoverHref', () => {
  it('builds object type URL with query and tags', () => {
    const href = buildDiscoverHref({
      type: 'product',
      q: 'test',
      tags: ['Bitter', 'Backpack'],
      sort: 'rank',
    });
    const url = new URL(href, 'http://local');
    expect(url.pathname).toBe('/discover');
    expect(url.searchParams.get('type')).toBe('product');
    expect(url.searchParams.get('q')).toBe('test');
    expect(url.searchParams.getAll('tags')).toEqual(['Bitter', 'Backpack']);
    expect(url.searchParams.get('sort')).toBe('rank');
  });

  it('builds users mode URL', () => {
    expect(buildDiscoverHref({ users: true, q: 'alice' })).toBe(
      '/discover?users=1&q=alice',
    );
  });
});

describe('parseDiscoverTagsParam', () => {
  it('parses array and dedupes empty', () => {
    expect(parseDiscoverTagsParam(['a', '', 'b'])).toEqual(['a', 'b']);
  });
});
