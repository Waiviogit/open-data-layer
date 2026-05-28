export type DiscoverUrlParams = {
  type?: string;
  users?: boolean;
  q?: string;
  tags?: string[];
  sort?: 'newest' | 'oldest' | 'rank';
};

export type DiscoverPageState = {
  usersMode: boolean;
  objectType: string | null;
  q: string;
  tags: string[];
  sort: 'newest' | 'oldest' | 'rank';
};

export const DEFAULT_DISCOVER_OBJECT_TYPE = 'product';

type DiscoverSearchParamsSource =
  | Record<string, string | string[] | undefined>
  | URLSearchParams;

function readSearchParam(source: DiscoverSearchParamsSource, key: string): string | null {
  if (source instanceof URLSearchParams) {
    return source.get(key);
  }
  const value = source[key];
  if (value == null) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function readSearchParamAll(source: DiscoverSearchParamsSource, key: string): string[] {
  if (source instanceof URLSearchParams) {
    return source.getAll(key);
  }
  const value = source[key];
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

/** Parse `/discover` query state from RSC `searchParams` or client `URLSearchParams`. */
export function parseDiscoverPageState(source: DiscoverSearchParamsSource): DiscoverPageState {
  const usersMode = readSearchParam(source, 'users') === '1';
  const objectType = usersMode
    ? null
    : (readSearchParam(source, 'type')?.trim() || DEFAULT_DISCOVER_OBJECT_TYPE);
  const q = readSearchParam(source, 'q')?.trim() ?? '';
  const tagsRaw = readSearchParamAll(source, 'tags');
  const tags = parseDiscoverTagsParam(
    tagsRaw.length > 0 ? tagsRaw : (readSearchParam(source, 'tags') ?? undefined),
  );
  const sortRaw = readSearchParam(source, 'sort');
  const sort =
    sortRaw === 'oldest' || sortRaw === 'rank' || sortRaw === 'newest' ? sortRaw : 'newest';

  return { usersMode, objectType, q, tags, sort };
}

/** Encodes tag filter for URL/API: `category:value` (split on first `:`). */
export function encodeTagFilter(category: string, value: string): string {
  return `${category}:${value}`;
}

/** Decodes `category:value` from URL query param; returns null if malformed. */
export function decodeTagFilter(encoded: string): { category: string; value: string } | null {
  const idx = encoded.indexOf(':');
  if (idx < 1) {
    return null;
  }
  const category = encoded.slice(0, idx);
  const value = encoded.slice(idx + 1);
  if (value.length === 0) {
    return null;
  }
  return { category, value };
}

export function buildDiscoverHref(params: DiscoverUrlParams): string {
  const sp = new URLSearchParams();
  if (params.users) {
    sp.set('users', '1');
  } else if (params.type?.trim()) {
    sp.set('type', params.type.trim());
  }
  const q = params.q?.trim();
  if (q) {
    sp.set('q', q);
  }
  for (const tag of params.tags ?? []) {
    const t = tag.trim();
    if (t) {
      sp.append('tags', t);
    }
  }
  if (params.sort && params.sort !== 'newest') {
    sp.set('sort', params.sort);
  }
  const qs = sp.toString();
  return qs.length > 0 ? `/discover?${qs}` : '/discover';
}

export function parseDiscoverTagsParam(raw: string | string[] | undefined): string[] {
  if (raw == null) {
    return [];
  }
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.map((s) => s.trim()).filter((s) => s.length > 0);
}
