import {
  parseHttpUrlFromPaste,
} from './image-cid-or-url-paste';

describe('parseHttpUrlFromPaste', () => {
  it('accepts a plain https URL', () => {
    expect(parseHttpUrlFromPaste('https://cdn.example/a.jpg')).toBe(
      'https://cdn.example/a.jpg',
    );
  });

  it('extracts URL from surrounding text', () => {
    expect(parseHttpUrlFromPaste('see https://cdn.example/x.png thanks')).toBe(
      'https://cdn.example/x.png',
    );
  });

  it('returns null for non-URL text', () => {
    expect(parseHttpUrlFromPaste('hello')).toBeNull();
  });
});
