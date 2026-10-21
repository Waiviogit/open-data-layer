import {
  AFFILIATE_CODE_CHANCE_SEPARATOR,
  AFFILIATE_CODE_SCOPE,
  AFFILIATE_CODE_SCOPES,
  type AffiliateCodeScope,
} from '@opden-data-layer/core/constants';
import {
  UPDATE_ARRAY_MAX,
  UPDATE_STRING_MAX,
} from '@opden-data-layer/core/update-registry';

export const AFFILIATE_CODE_CHANCE_TOTAL = 100;
export const AFFILIATE_CODE_MAX_ENTRIES = UPDATE_ARRAY_MAX.AFFILIATE_CODE - 1;

const CHANCE_SUFFIX_MAX = `${AFFILIATE_CODE_CHANCE_SEPARATOR}${AFFILIATE_CODE_CHANCE_TOTAL}`
  .length;
const CODE_MAX = UPDATE_STRING_MAX.LABEL - CHANCE_SUFFIX_MAX;

export type AffiliateCodeEntry = {
  code: string;
  chance: number;
};

export type AffiliateCodeFormValue = {
  scope: AffiliateCodeScope;
  entries: AffiliateCodeEntry[];
};

export function initialAffiliateCodeFormValue(): AffiliateCodeFormValue {
  return {
    scope: AFFILIATE_CODE_SCOPE.PERSONAL,
    entries: [{ code: '', chance: AFFILIATE_CODE_CHANCE_TOTAL }],
  };
}

export function parseAffiliateCodeFormValue(raw: unknown): AffiliateCodeFormValue {
  if (isFormObject(raw)) {
    return parseFormObject(raw);
  }
  if (Array.isArray(raw)) {
    return parseTokenArray(raw);
  }
  if (typeof raw === 'string') {
    return parseTokenArray(raw.split('\n'));
  }
  return initialAffiliateCodeFormValue();
}

export function sanitizeAffiliateCodeFormValue(raw: unknown): string[] {
  const parsed = parseAffiliateCodeFormValue(raw);
  const filled = parsed.entries
    .map((entry) => ({
      code: cleanCode(entry.code),
      chance: clampChance(entry.chance),
    }))
    .filter((entry) => entry.code.length > 0)
    .slice(0, AFFILIATE_CODE_MAX_ENTRIES);

  if (filled.length === 0) {
    return [parsed.scope];
  }

  const chances = scaleToTotal(
    filled.map((entry) => entry.chance),
    AFFILIATE_CODE_CHANCE_TOTAL,
  );
  return [
    parsed.scope,
    ...filled.map(
      (entry, i) =>
        `${entry.code}${AFFILIATE_CODE_CHANCE_SEPARATOR}${chances[i] ?? 0}`,
    ),
  ];
}

export function applyAffiliateCodeChance(
  entries: readonly AffiliateCodeEntry[],
  index: number,
  nextChance: number,
): AffiliateCodeEntry[] {
  if (entries.length === 0) {
    return [];
  }
  if (entries.length === 1) {
    return [{ ...entries[0], chance: AFFILIATE_CODE_CHANCE_TOTAL }];
  }
  const clamped = clampChance(nextChance);
  const others = entries.filter((_, i) => i !== index).map((entry) => entry.chance);
  const scaled = scaleToTotal(others, AFFILIATE_CODE_CHANCE_TOTAL - clamped);
  let otherIdx = 0;
  return entries.map((entry, i) => {
    if (i === index) {
      return { ...entry, chance: clamped };
    }
    const chance = scaled[otherIdx] ?? 0;
    otherIdx += 1;
    return { ...entry, chance };
  });
}

export function addAffiliateCodeEntry(
  entries: readonly AffiliateCodeEntry[],
): AffiliateCodeEntry[] {
  if (entries.length >= AFFILIATE_CODE_MAX_ENTRIES) {
    return [...entries];
  }
  return [...entries, { code: '', chance: 0 }];
}

export function removeAffiliateCodeEntry(
  entries: readonly AffiliateCodeEntry[],
  index: number,
): AffiliateCodeEntry[] {
  if (entries.length <= 1) {
    return [...entries];
  }
  const next = entries.filter((_, i) => i !== index);
  const scaled = scaleToTotal(
    next.map((entry) => entry.chance),
    AFFILIATE_CODE_CHANCE_TOTAL,
  );
  return next.map((entry, i) => ({ ...entry, chance: scaled[i] ?? 0 }));
}

function isFormObject(
  raw: unknown,
): raw is { scope?: unknown; entries?: unknown } {
  return Boolean(raw && typeof raw === 'object' && !Array.isArray(raw) && 'entries' in raw);
}

function parseFormObject(raw: {
  scope?: unknown;
  entries?: unknown;
}): AffiliateCodeFormValue {
  const scope = parseScope(raw.scope);
  const rows = Array.isArray(raw.entries) ? raw.entries : [];
  const entries = rows
    .map((row) => parseFormEntry(row))
    .slice(0, AFFILIATE_CODE_MAX_ENTRIES);
  if (entries.length === 0) {
    return initialAffiliateCodeFormValue();
  }
  return { scope, entries };
}

function parseFormEntry(row: unknown): AffiliateCodeEntry {
  if (!row || typeof row !== 'object') {
    return { code: '', chance: 0 };
  }
  const obj = row as Record<string, unknown>;
  const code = typeof obj.code === 'string' ? obj.code : '';
  return { code, chance: clampChance(Number(obj.chance)) };
}

function parseTokenArray(raw: unknown[]): AffiliateCodeFormValue {
  const tokens = raw
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (tokens.length === 0) {
    return initialAffiliateCodeFormValue();
  }

  const first = tokens[0];
  const hasScope = AFFILIATE_CODE_SCOPES.includes(first as AffiliateCodeScope);
  const scope = hasScope
    ? (first as AffiliateCodeScope)
    : AFFILIATE_CODE_SCOPE.PERSONAL;
  const codeTokens = (hasScope ? tokens.slice(1) : tokens).slice(
    0,
    AFFILIATE_CODE_MAX_ENTRIES,
  );
  if (codeTokens.length === 0) {
    return { scope, entries: [{ code: '', chance: AFFILIATE_CODE_CHANCE_TOTAL }] };
  }

  const parsed = codeTokens.map(parseChanceToken);
  const weights = parsed.map((item) => item.rawChance ?? 1);
  const chances = scaleToTotal(weights, AFFILIATE_CODE_CHANCE_TOTAL);
  return {
    scope,
    entries: parsed.map((item, i) => ({
      code: item.code,
      chance: chances[i] ?? 0,
    })),
  };
}

function parseChanceToken(token: string): { code: string; rawChance: number | null } {
  const separatorAt = token.indexOf(AFFILIATE_CODE_CHANCE_SEPARATOR);
  if (separatorAt < 0) {
    return { code: token, rawChance: null };
  }
  const code = token.slice(0, separatorAt);
  const chanceRaw = Number(
    token.slice(separatorAt + AFFILIATE_CODE_CHANCE_SEPARATOR.length),
  );
  if (!Number.isFinite(chanceRaw) || chanceRaw < 0) {
    return { code, rawChance: null };
  }
  return { code, rawChance: chanceRaw };
}

function parseScope(raw: unknown): AffiliateCodeScope {
  return AFFILIATE_CODE_SCOPES.includes(raw as AffiliateCodeScope)
    ? (raw as AffiliateCodeScope)
    : AFFILIATE_CODE_SCOPE.PERSONAL;
}

function cleanCode(code: string): string {
  return code
    .trim()
    .replaceAll(AFFILIATE_CODE_CHANCE_SEPARATOR, '')
    .slice(0, CODE_MAX);
}

export function clampChance(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(AFFILIATE_CODE_CHANCE_TOTAL, Math.round(value)));
}

export function scaleToTotal(values: number[], total: number): number[] {
  if (values.length === 0) {
    return [];
  }
  if (values.length === 1) {
    return [total];
  }
  const safeTotal = clampChance(total);
  const sum = values.reduce((acc, value) => acc + Math.max(0, value), 0);
  if (sum <= 0) {
    return splitRemaining(values.length, safeTotal);
  }
  const rounded = values.map((value) =>
    Math.round((Math.max(0, value) / sum) * safeTotal),
  );
  let diff = safeTotal - rounded.reduce((acc, value) => acc + value, 0);
  let i = rounded.length - 1;
  let guard = rounded.length * (Math.abs(diff) + 1);
  while (diff !== 0 && guard > 0) {
    const step = Math.sign(diff);
    const next = rounded[i] + step;
    if (next >= 0 && next <= AFFILIATE_CODE_CHANCE_TOTAL) {
      rounded[i] = next;
      diff -= step;
    }
    i = (i - 1 + rounded.length) % rounded.length;
    guard -= 1;
  }
  return rounded;
}

function splitRemaining(count: number, remaining: number): number[] {
  if (count <= 0) {
    return [];
  }
  const safe = clampChance(remaining);
  const base = Math.floor(safe / count);
  const extra = safe - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
}
