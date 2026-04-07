import { z } from 'zod';

export const APP_SHELL_MODE_COOKIE = 'app_shell_mode';

export const shellModePreferenceSchema = z.enum([
  'default',
  'twitter',
  'instagram',
  'compact',
]);

export type ParsedShellModePreference = z.infer<typeof shellModePreferenceSchema>;

export const SHELL_MODE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
