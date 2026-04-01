import { DEFAULT_LOCALE } from '../config/default-locale';
import { matchLocale, resolveLocale } from './resolve-locale';

describe('matchLocale', () => {
  it('returns null for empty input', () => {
    expect(matchLocale(null)).toBeNull();
    expect(matchLocale('')).toBeNull();
    expect(matchLocale('   ')).toBeNull();
  });

  it('matches exact id case-insensitively', () => {
    expect(matchLocale('en-us')).toBe('en-US');
    expect(matchLocale('ID-id')).toBe('id-ID');
  });

  it('matches primary language when unique', () => {
    expect(matchLocale('en')).toBe('en-US');
    expect(matchLocale('id')).toBe('id-ID');
  });

  it('returns null when primary language is ambiguous', () => {
    expect(matchLocale('xx')).toBeNull();
  });
});

describe('resolveLocale', () => {
  it('falls back to default for unsupported', () => {
    expect(resolveLocale('xx-YY')).toBe(DEFAULT_LOCALE);
  });
});
