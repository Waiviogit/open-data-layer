import { z } from 'zod';

/** Loose BCP-47-style locale tag (e.g. en-US, en, zh-Hans-CN). */
const localeTagSchema = z
  .string()
  .min(2)
  .max(50)
  .regex(/^[a-zA-Z]{2,8}(-[a-zA-Z0-9]{1,8})*$/, 'invalid locale tag');

export const DEFAULT_LOCALE = 'en-US';

/**
 * Resolves locale from optional `X-Locale` (override) and `Accept-Language` (first tag).
 * Falls back to {@link DEFAULT_LOCALE}.
 */
export function localeFromHeaders(
  acceptLanguage: string | undefined,
  xLocale: string | undefined,
): string {
  const trimmedOverride = xLocale?.trim();
  if (trimmedOverride) {
    const parsed = localeTagSchema.safeParse(trimmedOverride);
    if (parsed.success) {
      return parsed.data;
    }
  }

  if (acceptLanguage) {
    const first = acceptLanguage.split(',')[0]?.split(';')[0]?.trim();
    if (first) {
      const parsed = localeTagSchema.safeParse(first);
      if (parsed.success) {
        return parsed.data;
      }
    }
  }

  return DEFAULT_LOCALE;
}
