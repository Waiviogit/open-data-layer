import type { ThemeId, ThemePreference, ThemeResolution } from './types';

export function resolveTheme(params: {
  userPreference?: ThemePreference | null;
  cookiePreference?: ThemePreference | null;
  systemPrefersDark?: boolean | null;
  defaultPreference?: ThemePreference;
}): ThemeResolution {
  const defaultPreference = params.defaultPreference ?? 'system';

  let preference: ThemePreference;
  let source: ThemeResolution['source'];

  if (
    params.userPreference !== undefined &&
    params.userPreference !== null
  ) {
    preference = params.userPreference;
    source = 'user';
  } else if (
    params.cookiePreference !== undefined &&
    params.cookiePreference !== null
  ) {
    preference = params.cookiePreference;
    source = 'cookie';
  } else {
    preference = defaultPreference;
    if (preference === 'system') {
      source = 'system';
    } else {
      source = 'default';
    }
  }

  const resolvedTheme = resolveToThemeId(
    preference,
    params.systemPrefersDark,
  );

  return { preference, resolvedTheme, source };
}

function resolveToThemeId(
  preference: ThemePreference,
  systemPrefersDark: boolean | null | undefined,
): ThemeId {
  if (preference === 'system') {
    if (systemPrefersDark === true) {
      return 'dark';
    }
    if (systemPrefersDark === false) {
      return 'light';
    }
    return 'light';
  }
  return preference;
}
