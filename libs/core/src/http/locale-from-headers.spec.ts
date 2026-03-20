import { localeFromHeaders } from './locale-from-headers';

describe('localeFromHeaders', () => {
  it('returns en-US by default', () => {
    expect(localeFromHeaders(undefined, undefined)).toBe('en-US');
  });

  it('parses first Accept-Language tag', () => {
    expect(localeFromHeaders('en-US,en;q=0.9', undefined)).toBe('en-US');
  });

  it('prefers X-Locale over Accept-Language', () => {
    expect(localeFromHeaders('fr-FR', 'de-DE')).toBe('de-DE');
  });

  it('falls back when X-Locale is invalid', () => {
    expect(localeFromHeaders('es-ES', '!!!')).toBe('es-ES');
  });
});
