import { cookies } from 'next/headers';

import {
  APP_SHELL_MODE_COOKIE,
  SHELL_MODE_COOKIE_MAX_AGE_SECONDS,
  shellModePreferenceSchema,
} from './shell-mode-cookie.constants';
import type { ShellModePreference } from './types';

export async function getCookieShellMode(): Promise<ShellModePreference | null> {
  const store = await cookies();
  const raw = store.get(APP_SHELL_MODE_COOKIE)?.value;
  if (raw === undefined) {
    return null;
  }
  const parsed = shellModePreferenceSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function setCookieShellMode(
  preference: ShellModePreference,
): Promise<void> {
  const parsed = shellModePreferenceSchema.safeParse(preference);
  if (!parsed.success) {
    return;
  }
  const store = await cookies();
  store.set(APP_SHELL_MODE_COOKIE, parsed.data, {
    path: '/',
    sameSite: 'lax',
    maxAge: SHELL_MODE_COOKIE_MAX_AGE_SECONDS,
  });
}
