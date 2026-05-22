import {
  buildDiscoverHref,
  decodeTagFilter,
  encodeTagFilter,
  parseDiscoverTagsParam,
} from './discover-url';

describe('encodeTagFilter / decodeTagFilter', () => {
  it('round-trips category and value', () => {
    const encoded = encodeTagFilter('Cuisine', 'asian');
    expect(encoded).toBe('Cuisine:asian');
    expect(decodeTagFilter(encoded)).toEqual({ category: 'Cuisine', value: 'asian' });
  });

  it('splits on first colon for categories with spaces', () => {
    const encoded = encodeTagFilter('Meal Type', 'breakfast');
    expect(decodeTagFilter(encoded)).toEqual({ category: 'Meal Type', value: 'breakfast' });
  });

  it('returns null for value-only strings', () => {
    expect(decodeTagFilter('asian')).toBeNull();
    expect(decodeTagFilter(':asian')).toBeNull();
    expect(decodeTagFilter('Cuisine:')).toBeNull();
  });
});

describe('buildDiscoverHref', () => {
  it('builds object type URL with query and tags', () => {
    const href = buildDiscoverHref({
      type: 'product',
      q: 'test',
      tags: ['Flavor:Bitter', 'Type:Backpack'],
      sort: 'rank',
    });
    const url = new URL(href, 'http://local');
    expect(url.pathname).toBe('/discover');
    expect(url.searchParams.get('type')).toBe('product');
    expect(url.searchParams.get('q')).toBe('test');
    expect(url.searchParams.getAll('tags')).toEqual(['Flavor:Bitter', 'Type:Backpack']);
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
