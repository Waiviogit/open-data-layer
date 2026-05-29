import {
  searchCountsResponseSchema,
  searchResponseSchema,
  type SearchCountsResponse,
  type SearchObjectResult,
  type SearchResponse,
  type SearchUserResult,
} from '../domain/search-response.schema';

type SearchFetchType = 'all' | 'objects' | 'users';

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

/** Picks the search hit for a known Hive account name (draft / prefilled user refs). */
export function pickSearchUserByName(
  users: readonly SearchUserResult[],
  accountName: string,
): SearchUserResult | null {
  const name = accountName.trim();
  if (!name) {
    return null;
  }
  const lower = name.toLowerCase();
  const exact = users.find((u) => u.name.toLowerCase() === lower);
  if (exact) {
    return exact;
  }
  if (users.length === 1) {
    return users[0];
  }
  return null;
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

async function fetchSearchByType(
  query: string,
  type: SearchFetchType,
  init?: { signal?: AbortSignal; limit?: string },
): Promise<SearchResponse | null> {
  const q = query.trim();
  if (!q) {
    return null;
  }

  const params = new URLSearchParams({
    q,
    limit: init?.limit ?? '20',
  });
  if (type !== 'all') {
    params.set('type', type);
  }

  let res: Response;
  try {
    res = await fetch(`/api/search?${params.toString()}`, {
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
 * Client-side fetch to the BFF search route (session viewer applied server-side).
 */
export async function fetchSearchResults(
  query: string,
  init?: { signal?: AbortSignal },
): Promise<SearchResponse | null> {
  return fetchSearchByType(query, 'all', init);
}

/** Only users — skips object FTS/projection on query-api. */
export async function fetchUserSearchResults(
  query: string,
  init?: { signal?: AbortSignal },
): Promise<SearchUserResult[] | null> {
  const res = await fetchSearchByType(query, 'users', init);
  if (!res) {
    return null;
  }
  return res.users;
}

/** Only objects — skips user search on query-api. */
export async function fetchObjectSearchResults(
  query: string,
  init?: { signal?: AbortSignal; appliesTo?: readonly string[] },
): Promise<SearchObjectResult[] | null> {
  const res = await fetchSearchByType(query, 'objects', init);
  if (!res) {
    return null;
  }
  return filterSearchObjectsByAppliesTo(res.objects, init?.appliesTo);
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
  const objects = await fetchObjectSearchResults(id, init);
  if (!objects) {
    return null;
  }
  return pickSearchObjectById(objects, id, init?.appliesTo);
}

/**
 * Resolves display fields for a stored user ref via the same search API as the picker.
 */
export async function fetchSearchUserByName(
  accountName: string,
  init?: { signal?: AbortSignal },
): Promise<SearchUserResult | null> {
  const name = accountName.trim();
  if (!name) {
    return null;
  }
  const users = await fetchUserSearchResults(name, init);
  if (!users) {
    return null;
  }
  return pickSearchUserByName(users, name);
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
