import { resolveTheme } from './resolve-theme';

describe('resolveTheme', () => {
  it('uses user preference when set', () => {
    const r = resolveTheme({
      userPreference: 'dark',
      cookiePreference: 'light',
      systemPrefersDark: false,
    });
    expect(r).toEqual({
      preference: 'dark',
      resolvedTheme: 'dark',
      source: 'user',
    });
  });

  it('uses cookie when user is null', () => {
    const r = resolveTheme({
      userPreference: null,
      cookiePreference: 'sepia',
      systemPrefersDark: true,
    });
    expect(r).toEqual({
      preference: 'sepia',
      resolvedTheme: 'sepia',
      source: 'cookie',
    });
  });

  it('resolves apple from cookie', () => {
    const r = resolveTheme({
      userPreference: null,
      cookiePreference: 'apple',
      systemPrefersDark: false,
    });
    expect(r).toEqual({
      preference: 'apple',
      resolvedTheme: 'apple',
      source: 'cookie',
    });
  });

  it('resolves airbnb from cookie', () => {
    const r = resolveTheme({
      userPreference: null,
      cookiePreference: 'airbnb',
      systemPrefersDark: false,
    });
    expect(r).toEqual({
      preference: 'airbnb',
      resolvedTheme: 'airbnb',
      source: 'cookie',
    });
  });

  it('resolves waivio from cookie', () => {
    const r = resolveTheme({
      userPreference: null,
      cookiePreference: 'waivio',
      systemPrefersDark: false,
    });
    expect(r).toEqual({
      preference: 'waivio',
      resolvedTheme: 'waivio',
      source: 'cookie',
    });
  });

  it('resolves system to dark when systemPrefersDark is true', () => {
    const r = resolveTheme({
      userPreference: null,
      cookiePreference: null,
      systemPrefersDark: true,
      defaultPreference: 'system',
    });
    expect(r.preference).toBe('system');
    expect(r.resolvedTheme).toBe('dark');
    expect(r.source).toBe('system');
  });

  it('resolves system to light when systemPrefersDark is false', () => {
    const r = resolveTheme({
      userPreference: null,
      cookiePreference: 'system',
      systemPrefersDark: false,
    });
    expect(r.preference).toBe('system');
    expect(r.resolvedTheme).toBe('light');
    expect(r.source).toBe('cookie');
  });

  it('uses default non-system preference with source default', () => {
    const r = resolveTheme({
      userPreference: null,
      cookiePreference: null,
      systemPrefersDark: null,
      defaultPreference: 'sepia',
    });
    expect(r).toEqual({
      preference: 'sepia',
      resolvedTheme: 'sepia',
      source: 'default',
    });
  });
});
