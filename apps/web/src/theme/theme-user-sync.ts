import { env } from '@/config/env';

import type { ThemePreference } from './types';

/**
 * Persists theme preference to the backend when auth + env are available.
 * No-op until `WEB_THEME_SYNC_URL` (or similar) is configured.
 */
export async function syncThemePreferenceToBackend(
  preference: ThemePreference,
): Promise<void> {
  const url = env.WEB_THEME_SYNC_URL;
  if (!url || url.length === 0) {
    return;
  }

  try {
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: preference }),
    });
  } catch {
    // Logged server-side if needed; do not break cookie persistence
  }
}
