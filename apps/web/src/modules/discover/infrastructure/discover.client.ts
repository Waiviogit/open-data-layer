import {
  discoverObjectsPageSchema,
  discoverTagCategoriesResponseSchema,
  discoverUsersPageSchema,
  type DiscoverObjectsPage,
  type DiscoverTagCategoriesResponse,
  type DiscoverUsersPage,
} from '../domain/discover-response.schema';

export type FetchDiscoverObjectsParams = {
  objectType?: string;
  q?: string;
  tags?: string[];
  sort?: 'newest' | 'oldest' | 'rank';
  cursor?: string | null;
  limit?: number;
  signal?: AbortSignal;
};

export async function fetchDiscoverObjects(
  params: FetchDiscoverObjectsParams,
): Promise<DiscoverObjectsPage | null> {
  const sp = new URLSearchParams();
  if (params.objectType?.trim()) {
    sp.set('object_type', params.objectType.trim());
  }
  if (params.q?.trim()) {
    sp.set('q', params.q.trim());
  }
  for (const tag of params.tags ?? []) {
    const t = tag.trim();
    if (t) {
      sp.append('tags', t);
    }
  }
  if (params.sort) {
    sp.set('sort', params.sort);
  }
  if (params.cursor?.trim()) {
    sp.set('cursor', params.cursor.trim());
  }
  if (params.limit != null) {
    sp.set('limit', String(params.limit));
  }

  try {
    const res = await fetch(`/api/discover/objects?${sp.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: params.signal,
    });
    if (!res.ok) {
      return null;
    }
    const raw: unknown = await res.json();
    const parsed = discoverObjectsPageSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export type FetchDiscoverUsersParams = {
  q?: string;
  cursor?: string | null;
  limit?: number;
  signal?: AbortSignal;
};

export async function fetchDiscoverUsers(
  params: FetchDiscoverUsersParams,
): Promise<DiscoverUsersPage | null> {
  const sp = new URLSearchParams();
  if (params.q?.trim()) {
    sp.set('q', params.q.trim());
  }
  if (params.cursor?.trim()) {
    sp.set('cursor', params.cursor.trim());
  }
  if (params.limit != null) {
    sp.set('limit', String(params.limit));
  }

  try {
    const res = await fetch(`/api/discover/users?${sp.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: params.signal,
    });
    if (!res.ok) {
      return null;
    }
    const raw: unknown = await res.json();
    const parsed = discoverUsersPageSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function fetchDiscoverTagCategories(
  objectType: string,
  init?: { signal?: AbortSignal },
): Promise<DiscoverTagCategoriesResponse | null> {
  const sp = new URLSearchParams({ object_type: objectType.trim() });
  try {
    const res = await fetch(`/api/discover/tag-categories?${sp.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: init?.signal,
    });
    if (!res.ok) {
      return null;
    }
    const raw: unknown = await res.json();
    const parsed = discoverTagCategoriesResponseSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
