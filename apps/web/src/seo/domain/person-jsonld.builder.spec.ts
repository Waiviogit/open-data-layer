import { buildPersonJsonLd } from './person-jsonld.builder';

describe('buildPersonJsonLd', () => {
  it('builds Person schema', () => {
    const json = buildPersonJsonLd(
      {
        name: 'alice',
        displayName: 'Alice',
        bio: 'Hive blogger',
        avatarUrl: 'https://cdn.example/alice.jpg',
        coverImageUrl: null,
        reputation: 50,
      },
      'https://site.com/@alice',
    );
    expect(json['@type']).toBe('Person');
    expect(json.name).toBe('Alice');
    expect(json.url).toBe('https://site.com/@alice');
  });
});
