import 'server-only';

import type { FavoritesObjectsPage, FavoritesTypesResponse } from '../../domain/types/favorites';
import {
  favoritesObjectsPageSchema,
  favoritesTypesResponseSchema,
} from '../../domain/types/favorites';
import { queryApiFetch } from './query-api.client';
import { queryApiCacheTags } from '@/shared/infrastructure/query/query-api-cache-tags';

function viewerHeaders(viewer?: string | null): Record<string, string> | undefined {
  const v = viewer?.trim();
  if (!v) {
    return undefined;
  }
  return { 'X-Viewer': v };
}

export type FetchFavoritesObjectsParams = {
  objectType?: string;
  skip?: number;
  limit?: number;
};

function buildFavoritesObjectsSearchParams(params: FetchFavoritesObjectsParams): string {
  const sp = new URLSearchParams();
  const objectType = params.objectType?.trim();
  if (objectType && objectType.length > 0) {
    sp.set('objectType', objectType);
  }
  if (params.skip != null) {
    sp.set('skip', String(params.skip));
  }
  if (params.limit != null) {
    sp.set('limit', String(params.limit));
  }
  const q = sp.toString();
  return q.length > 0 ? `?${q}` : '';
}

export async function fetchFavoritesTypes(
  username: string,
): Promise<FavoritesTypesResponse | null> {
  const name = username.trim();
  if (name.length === 0) {
    return null;
  }
  const path = `/query/v1/users/${encodeURIComponent(name)}/favorites/types`;
  const raw = await queryApiFetch<unknown>(path, {
    cacheTags: [queryApiCacheTags.userFavoritesTypes(name)],
  });
  if (raw == null) {
    return null;
  }
  const parsed = favoritesTypesResponseSchema.safeParse(raw);
  if (!parsed.success) {
    console.error('[fetchFavoritesTypes] unexpected response', parsed.error.flatten());
    return null;
  }
  return parsed.data;
}

export async function fetchFavoritesObjects(
  username: string,
  params: FetchFavoritesObjectsParams,
  init?: { viewer?: string | null },
): Promise<FavoritesObjectsPage | null> {
  const name = username.trim();
  if (name.length === 0) {
    return null;
  }
  const qs = buildFavoritesObjectsSearchParams(params);
  const path = `/query/v1/users/${encodeURIComponent(name)}/favorites${qs}`;
  const headers = viewerHeaders(init?.viewer ?? null);
  const raw = await queryApiFetch<unknown>(path, {
    headers,
    cacheTags: [queryApiCacheTags.userFavorites(name)],
    forwardClientIp: true,
  });
  if (raw == null) {
    return null;
  }
  const parsed = favoritesObjectsPageSchema.safeParse(raw);
  if (!parsed.success) {
    console.error('[fetchFavoritesObjects] unexpected response', parsed.error.flatten());
    return null;
  }
  return parsed.data;
}
