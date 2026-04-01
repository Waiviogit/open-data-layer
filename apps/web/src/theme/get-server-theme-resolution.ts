import { headers } from 'next/headers';

import { getCookieTheme } from './theme-cookie';
import { getUserThemePreference } from './get-user-theme-preference';
import { resolveTheme } from './resolve-theme';
import type { ThemeResolution } from './types';

function parseSecChPrefersColorScheme(
  value: string | null,
): boolean | null {
  if (value === 'dark') {
    return true;
  }
  if (value === 'light') {
    return false;
  }
  return null;
}

export async function getServerThemeResolution(): Promise<ThemeResolution> {
  const [userPreference, cookiePreference, headerList] = await Promise.all([
    getUserThemePreference(),
    getCookieTheme(),
    headers(),
  ]);

  const secCh = headerList.get('sec-ch-prefers-color-scheme');
  const systemPrefersDark = parseSecChPrefersColorScheme(secCh);

  return resolveTheme({
    userPreference,
    cookiePreference,
    systemPrefersDark,
    defaultPreference: 'system',
  });
}
