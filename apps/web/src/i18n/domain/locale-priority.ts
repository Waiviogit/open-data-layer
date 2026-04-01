import { DEFAULT_LOCALE } from '../config/default-locale';
import type { LocaleId } from '../types';
import { matchLocale } from './resolve-locale';

export type LocalePriorityInput = {
  userLocale?: string | null;
  cookieLocale?: string | null;
  headerLocales: string[];
};

/**
 * Priority: user → cookie → Accept-Language (first supported) → default.
 */
export function resolveLocalePriority(input: LocalePriorityInput): LocaleId {
  const user = matchLocale(input.userLocale);
  if (user) {
    return user;
  }

  const cookie = matchLocale(input.cookieLocale);
  if (cookie) {
    return cookie;
  }

  for (const tag of input.headerLocales) {
    const fromHeader = matchLocale(tag);
    if (fromHeader) {
      return fromHeader;
    }
  }

  return DEFAULT_LOCALE;
}
