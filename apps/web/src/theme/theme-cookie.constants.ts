import { z } from 'zod';

export const APP_THEME_COOKIE = 'app_theme';

export const themePreferenceSchema = z.enum([
  'light',
  'dark',
  'sepia',
  'system',
]);

export type ParsedThemePreference = z.infer<typeof themePreferenceSchema>;

export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
