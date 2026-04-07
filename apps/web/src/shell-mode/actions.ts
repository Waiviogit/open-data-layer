'use server';

import { shellModePreferenceSchema } from './shell-mode-cookie.constants';
import { setCookieShellMode } from './shell-mode-cookie';
import type { ShellModePreference } from './types';

export async function setShellModePreference(
  preference: ShellModePreference,
): Promise<{ ok: boolean }> {
  const parsed = shellModePreferenceSchema.safeParse(preference);
  if (!parsed.success) {
    return { ok: false };
  }
  await setCookieShellMode(parsed.data);
  return { ok: true };
}
