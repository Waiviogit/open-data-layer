import {
  searchCountsResponseSchema,
  searchResponseSchema,
  type SearchCountsResponse,
  type SearchObjectResult,
  type SearchResponse,
} from '../domain/search-response.schema';

function filterSearchObjectsByAppliesTo(
  objects: SearchObjectResult[],
  appliesTo?: readonly string[],
): SearchObjectResult[] {
  if (!appliesTo?.length) {
    return objects;
  }
  const allowed = new Set(appliesTo);
  return objects.filter((r) => allowed.has(r.object_type));
}

/** Picks the search hit for a known `object_id` (draft / prefilled refs). */
export function pickSearchObjectById(
  objects: readonly SearchObjectResult[],
  objectId: string,
  appliesTo?: readonly string[],
): SearchObjectResult | null {
  const id = objectId.trim();
  if (!id) {
    return null;
  }
  const filtered = filterSearchObjectsByAppliesTo([...objects], appliesTo);
  const exact = filtered.find((o) => o.object_id === id);
  if (exact) {
    return exact;
  }
  if (filtered.length === 1) {
    return filtered[0];
  }
  return null;
}

/**
 * Client-side fetch to the BFF search route (session viewer applied server-side).
 */
export async function fetchSearchResults(
  query: string,
  init?: { signal?: AbortSignal },
): Promise<SearchResponse | null> {
  const q = query.trim();
  if (!q) {
    return null;
  }

  let res: Response;
  try {
    res = await fetch(
      `/api/search?${new URLSearchParams({ q, limit: '20' }).toString()}`,
      {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: init?.signal,
    });
  } catch {
    return null;
  }

  if (!res.ok) {
    return null;
  }

  const raw: unknown = await res.json();
  const parsed = searchResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

/**
 * Resolves display fields for a stored object ref via the same search API as the picker.
 */
export async function fetchSearchObjectById(
  objectId: string,
  init?: { signal?: AbortSignal; appliesTo?: readonly string[] },
): Promise<SearchObjectResult | null> {
  const id = objectId.trim();
  if (!id) {
    return null;
  }
  const res = await fetchSearchResults(id, init);
  if (!res) {
    return null;
  }
  return pickSearchObjectById(res.objects, id, init?.appliesTo);
}

/**
 * Global tab counts for header search (BFF → query-api `/search/counts`).
 */
export async function fetchSearchCounts(
  query: string,
  init?: { signal?: AbortSignal },
): Promise<SearchCountsResponse | null> {
  const q = query.trim();
  if (!q) {
    return null;
  }

  let res: Response;
  try {
    res = await fetch(`/api/search/counts?${new URLSearchParams({ q }).toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: init?.signal,
    });
  } catch {
    return null;
  }

  if (!res.ok) {
    return null;
  }

  const raw: unknown = await res.json();
  const parsed = searchCountsResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}
