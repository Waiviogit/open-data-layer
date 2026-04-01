import { DEFAULT_LOCALE } from '../config/default-locale';
import { locales } from '../config/locales';
import type { LocaleId } from '../types';

const localeIds = locales.map((l) => l.id);
const lowerIdToCanonical = new Map<string, LocaleId>(
  localeIds.map((id) => [id.toLowerCase(), id]),
);

function normalizeTag(tag: string): string {
  return tag.trim().replace(/_/g, '-');
}

/**
 * Returns a supported locale id, or null if the input is empty or not supported.
 */
export function matchLocale(input?: string | null): LocaleId | null {
  if (input == null) {
    return null;
  }
  const raw = normalizeTag(input);
  if (!raw) {
    return null;
  }

  const exact = lowerIdToCanonical.get(raw.toLowerCase());
  if (exact) {
    return exact;
  }

  const primary = raw.split('-')[0]?.toLowerCase();
  if (!primary) {
    return null;
  }

  const byPrimary = localeIds.filter(
    (id) => id.split('-')[0]?.toLowerCase() === primary,
  );
  if (byPrimary.length === 1) {
    return byPrimary[0];
  }

  return null;
}

/**
 * Resolves a locale string to a supported id, falling back to the default locale.
 */
export function resolveLocale(input?: string | null): LocaleId {
  return matchLocale(input) ?? DEFAULT_LOCALE;
}
