type EldSmall = {
  detect: (text: string) => { getScores: () => Record<string, number> };
};

let eldInstance: EldSmall | undefined;
let eldLoad: Promise<EldSmall> | undefined;

/**
 * Loads `eld/small` via a runtime `import()` that webpack cannot rewrite to `require()`.
 *
 * Webpack converts `import('eld/small')` → `__webpack_require__(…)` → `require('eld/small')`.
 * `eld` is ESM-only (`"type": "module"`) and only exposes `./small` under `"import"` in its
 * exports map, so CJS `require()` always throws `ERR_PACKAGE_PATH_NOT_EXPORTED`.
 *
 * Placing the expression inside `new Function(…)` keeps it as a plain string at build time;
 * at runtime Node evaluates it as a real dynamic `import()` and the ESM resolver works.
 */
const runtimeImport = new Function('return import("eld/small")') as () => Promise<{ eld: EldSmall }>;

async function getEld(): Promise<EldSmall> {
  if (eldInstance) {
    return eldInstance;
  }
  if (!eldLoad) {
    eldLoad = runtimeImport().then((mod) => {
      eldInstance = mod.eld;
      return eldInstance;
    });
  }
  return eldLoad;
}

/** Max languages stored when several scores tie the leader (e.g. bilingual post). */
const MAX_DETECTED_LANGUAGES = 2;

/**
 * Languages within this ratio of the top score are kept (e.g. es/en both high on mixed text).
 * Keeps single-language posts from picking unrelated runners-up (Polish vs other Slavic).
 */
const SCORE_TIE_RATIO = 0.92;

function buildLanguageDetectionText(title: string | undefined, body: string): string {
  const b = body.trim();
  const t = title?.trim() ?? '';
  if (!t) {
    return b;
  }
  if (!b) {
    return t;
  }
  return `${t}\n\n${b}`;
}

function canonicalizeLangTag(code: string): string | null {
  const c = code.trim();
  if (!c) {
    return null;
  }
  try {
    return Intl.getCanonicalLocales(c)[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Maps ELD `getScores()` output to stored BCP 47 tags (same rules as {@link detectPostLanguagesBcp47}).
 * Exported for unit tests: Jest cannot load `eld/small` (dynamic `import()` in VM).
 */
export function languagesFromEldScores(scores: Record<string, number>): string[] {
  const ranked = Object.entries(scores)
    .filter(([, score]) => score > 0 && Number.isFinite(score))
    .sort((a, b) => b[1] - a[1]);

  if (ranked.length === 0) {
    return [];
  }

  const first = ranked[0];
  if (!first) {
    return [];
  }
  const [, topScore] = first;
  const minScore = topScore * SCORE_TIE_RATIO;
  const tags: string[] = [];
  const seen = new Set<string>();

  for (const [code, score] of ranked) {
    if (score < minScore) {
      break;
    }
    const tag = canonicalizeLangTag(code);
    if (!tag || seen.has(tag)) {
      continue;
    }
    seen.add(tag);
    tags.push(tag);
    if (tags.length >= MAX_DETECTED_LANGUAGES) {
      break;
    }
  }

  return tags;
}

/**
 * Detect languages from post title + body. Returns canonical BCP 47 tags (language-only where region unknown).
 *
 * Uses ELD `getScores()` ranked by confidence: keeps languages within {@link SCORE_TIE_RATIO} of the
 * top score (up to {@link MAX_DETECTED_LANGUAGES}). Avoids a flat low threshold, which over-tags
 * many Latin/Slavic languages, while still allowing a second language when two score equally high
 * (bilingual text).
 */
export async function detectPostLanguagesBcp47(
  body: string,
  title?: string,
): Promise<string[]> {
  const text = buildLanguageDetectionText(title, body);
  if (!text) {
    return [];
  }

  const eld = await getEld();
  const scores = eld.detect(text).getScores() as Record<string, number>;
  return languagesFromEldScores(scores);
}
