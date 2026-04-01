import { DEFAULT_LOCALE } from '../config/default-locale';
import { resolveLocalePriority } from './locale-priority';

describe('resolveLocalePriority', () => {
  it('prefers user over cookie and headers', () => {
    expect(
      resolveLocalePriority({
        userLocale: 'id-ID',
        cookieLocale: 'en-US',
        headerLocales: ['en-US'],
      }),
    ).toBe('id-ID');
  });

  it('uses cookie when user is absent', () => {
    expect(
      resolveLocalePriority({
        userLocale: null,
        cookieLocale: 'id-ID',
        headerLocales: ['en-US'],
      }),
    ).toBe('id-ID');
  });

  it('uses first supported header when user and cookie absent', () => {
    expect(
      resolveLocalePriority({
        userLocale: null,
        cookieLocale: null,
        headerLocales: ['sv-SE', 'id', 'en-US'],
      }),
    ).toBe('id-ID');
  });

  it('falls back to default', () => {
    expect(
      resolveLocalePriority({
        userLocale: null,
        cookieLocale: null,
        headerLocales: ['xx-YY'],
      }),
    ).toBe(DEFAULT_LOCALE);
  });
});
