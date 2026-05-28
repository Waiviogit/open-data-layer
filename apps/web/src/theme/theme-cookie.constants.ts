import { z } from 'zod';

export const APP_THEME_COOKIE = 'app_theme';

export const themePreferenceSchema = z.enum([
  'light',
  'dark',
  'studio',
  'midnight',
  'sepia',
  'apple',
  'airbnb',
  'system',
]);

export type ParsedThemePreference = z.infer<typeof themePreferenceSchema>;

export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/** Legacy cookie values mapped to current theme ids. */
export const LEGACY_THEME_COOKIE_ALIASES: Readonly<Record<string, ParsedThemePreference>> =
  {
    waivio: 'light',
  };
