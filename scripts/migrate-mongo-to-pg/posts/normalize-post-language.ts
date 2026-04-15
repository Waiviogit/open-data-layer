/**
 * Mongo legacy exports use full BCP 47 tags (e.g. en-US). ODL `post_languages.language` stores
 * the primary language subtag only (en), aligned with chain-indexer detection.
 */
export function normalizeMongoPostLanguage(raw: string): string | null {
  const t = raw.trim();
  if (!t) {
    return null;
  }

  const bcp47 = t.replace(/_/g, '-');

  try {
    const loc = new Intl.Locale(bcp47);
    const lang = loc.language;
    if (!lang || lang === 'und') {
      return null;
    }
    try {
      return Intl.getCanonicalLocales(lang)[0] ?? lang;
    } catch {
      return lang;
    }
  } catch {
    const first = bcp47.split('-')[0];
    if (!first) {
      return null;
    }
    try {
      return Intl.getCanonicalLocales(first)[0] ?? null;
    } catch {
      return null;
    }
  }
}
