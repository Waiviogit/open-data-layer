import type { ThemePreference } from './types';

/**
 * Returns persisted user theme when auth + backend are wired; otherwise null.
 */
export async function getUserThemePreference(): Promise<ThemePreference | null> {
  return null;
}
