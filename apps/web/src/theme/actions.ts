'use server';

import { themePreferenceSchema } from './theme-cookie.constants';
import { setCookieTheme } from './theme-cookie';
import { syncThemePreferenceToBackend } from './theme-user-sync';
import type { ThemePreference } from './types';

export async function setThemePreference(
  preference: ThemePreference,
): Promise<{ ok: boolean }> {
  const parsed = themePreferenceSchema.safeParse(preference);
  if (!parsed.success) {
    return { ok: false };
  }
  await setCookieTheme(parsed.data);
  await syncThemePreferenceToBackend(parsed.data);
  return { ok: true };
}
