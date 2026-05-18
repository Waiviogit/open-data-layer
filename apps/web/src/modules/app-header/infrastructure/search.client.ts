import { searchResponseSchema, type SearchResponse } from '../domain/search-response.schema';

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
    res = await fetch(`/api/search?${new URLSearchParams({ q }).toString()}`, {
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
