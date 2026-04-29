import 'server-only';

import type { ShopObjectsPage, ShopSectionsPage } from '../../domain/types/shop-objects';
import { shopObjectsPageSchema, shopSectionsPageSchema } from '../../domain/types/shop-objects';
import { queryApiFetch } from './query-api.client';

export type FetchShopObjectsParams = {
  types: readonly string[];
  categoryPath: string[];
  /** When true, only objects with no category tags (query-api `uncategorizedOnly`). */
  uncategorizedOnly?: boolean;
  limit?: number;
  cursor?: string | null;
};

function buildShopObjectsSearchParams(params: FetchShopObjectsParams): string {
  const sp = new URLSearchParams();
  for (const t of params.types) {
    sp.append('types', t);
  }
  for (const segment of params.categoryPath) {
    if (segment.trim().length > 0) {
      sp.append('categoryPath', segment);
    }
  }
  if (params.uncategorizedOnly === true) {
    sp.set('uncategorizedOnly', 'true');
  }
  if (params.limit != null) {
    sp.set('limit', String(params.limit));
  }
  if (params.cursor != null && params.cursor.trim().length > 0) {
    sp.set('cursor', params.cursor.trim());
  }
  const q = sp.toString();
  return q.length > 0 ? `?${q}` : '';
}

export type FetchShopSectionsParams = {
  types: readonly string[];
  /** Parent department (drill-down); omit at root. */
  name?: string;
  /** Ancestors before `name`. */
  path?: string[];
  cursor?: string | null;
  sectionLimit?: number;
};

function buildShopSectionsSearchParams(params: FetchShopSectionsParams): string {
  const sp = new URLSearchParams();
  for (const t of params.types) {
    sp.append('types', t);
  }
  const parent = params.name?.trim();
  if (parent && parent.length > 0) {
    sp.set('name', parent);
  }
  for (const segment of params.path ?? []) {
    if (segment.trim().length > 0) {
      sp.append('path', segment);
    }
  }
  if (params.sectionLimit != null) {
    sp.set('sectionLimit', String(params.sectionLimit));
  }
  if (params.cursor != null && params.cursor.trim().length > 0) {
    sp.set('cursor', params.cursor.trim());
  }
  const q = sp.toString();
  return q.length > 0 ? `?${q}` : '';
}

function viewerHeaders(viewer?: string | null): Record<string, string> | undefined {
  const v = viewer?.trim();
  if (!v) {
    return undefined;
  }
  return { 'X-Viewer': v };
}

export async function fetchShopObjects(
  username: string,
  params: FetchShopObjectsParams,
  init?: { viewer?: string | null },
): Promise<ShopObjectsPage | null> {
  const name = username.trim();
  if (name.length === 0) {
    return null;
  }
  const qs = buildShopObjectsSearchParams(params);
  const path = `/query/v1/users/${encodeURIComponent(name)}/shop-objects${qs}`;
  const headers = viewerHeaders(init?.viewer ?? null);
  const raw = await queryApiFetch<unknown>(path, headers ? { headers } : undefined);
  if (raw == null) {
    return null;
  }
  const parsed = shopObjectsPageSchema.safeParse(raw);
  if (!parsed.success) {
    console.error('[fetchShopObjects] unexpected response', parsed.error.flatten());
    return null;
  }
  return parsed.data;
}

export async function fetchShopSections(
  username: string,
  params: FetchShopSectionsParams,
  init?: { viewer?: string | null },
): Promise<ShopSectionsPage | null> {
  const name = username.trim();
  if (name.length === 0) {
    return null;
  }
  const qs = buildShopSectionsSearchParams(params);
  const path = `/query/v1/users/${encodeURIComponent(name)}/shop-sections${qs}`;
  const headers = viewerHeaders(init?.viewer ?? null);
  const raw = await queryApiFetch<unknown>(path, headers ? { headers } : undefined);
  if (raw == null) {
    return null;
  }
  const parsed = shopSectionsPageSchema.safeParse(raw);
  if (!parsed.success) {
    console.error('[fetchShopSections] unexpected response', parsed.error.flatten());
    return null;
  }
  return parsed.data;
}
