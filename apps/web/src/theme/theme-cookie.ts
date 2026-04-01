import { cookies } from 'next/headers';

import {
  APP_THEME_COOKIE,
  COOKIE_MAX_AGE_SECONDS,
  themePreferenceSchema,
} from './theme-cookie.constants';
import type { ThemePreference } from './types';

export async function getCookieTheme(): Promise<ThemePreference | null> {
  const store = await cookies();
  const raw = store.get(APP_THEME_COOKIE)?.value;
  if (raw === undefined) {
    return null;
  }
  const parsed = themePreferenceSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function setCookieTheme(
  preference: ThemePreference,
): Promise<void> {
  const parsed = themePreferenceSchema.safeParse(preference);
  if (!parsed.success) {
    return;
  }
  const store = await cookies();
  store.set(APP_THEME_COOKIE, parsed.data, {
    path: '/',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}
