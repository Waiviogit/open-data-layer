import { parsePostingMetadata } from './get-user-profile.endpoint';

describe('parsePostingMetadata', () => {
  it('returns null for null or empty', () => {
    expect(parsePostingMetadata(null)).toBeNull();
    expect(parsePostingMetadata('')).toBeNull();
    expect(parsePostingMetadata('   ')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parsePostingMetadata('not json')).toBeNull();
  });

  it('parses profile fields when present', () => {
    const raw = JSON.stringify({
      profile: {
        name: 'Display',
        about: 'Bio text',
        profile_image: 'https://example.com/a.jpg',
        cover_image: 'https://example.com/c.jpg',
      },
    });
    const result = parsePostingMetadata(raw);
    expect(result).toEqual({
      profile: {
        name: 'Display',
        about: 'Bio text',
        profile_image: 'https://example.com/a.jpg',
        cover_image: 'https://example.com/c.jpg',
      },
    });
  });

  it('returns null when profile is missing or not an object', () => {
    expect(parsePostingMetadata('{}')).toBeNull();
    expect(parsePostingMetadata(JSON.stringify({ profile: null }))).toBeNull();
    expect(parsePostingMetadata(JSON.stringify({ profile: 'x' }))).toBeNull();
  });
});
