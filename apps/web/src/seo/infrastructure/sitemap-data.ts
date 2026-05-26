import 'server-only';

import { z } from 'zod';

import { queryApiFetch } from '@/modules/user-profile/infrastructure/clients/query-api.client';

const discoverObjectsResponseSchema = z.object({
  items: z.array(
    z.object({
      object_id: z.string(),
    }),
  ),
  cursor: z.string().nullable(),
  hasMore: z.boolean(),
});

const discoverUsersResponseSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
    }),
  ),
  cursor: z.string().nullable(),
  hasMore: z.boolean(),
});

const PAGE_SIZE = 100;

async function paginateDiscover<T>(
  path: string,
  params: Record<string, string>,
  maxItems: number,
  mapItem: (item: unknown) => T | null,
): Promise<T[]> {
  const results: T[] = [];
  let cursor: string | undefined;

  while (results.length < maxItems) {
    const search = new URLSearchParams({
      ...params,
      limit: String(Math.min(PAGE_SIZE, maxItems - results.length)),
      ...(cursor ? { cursor } : {}),
    });
    const raw = await queryApiFetch<unknown>(`${path}?${search.toString()}`, {
      next: { revalidate: 3600 },
    });
    if (!raw) {
      break;
    }
    const parsed =
      path.includes('/users')
        ? discoverUsersResponseSchema.safeParse(raw)
        : discoverObjectsResponseSchema.safeParse(raw);
    if (!parsed.success) {
      break;
    }
    for (const item of parsed.data.items) {
      const mapped = mapItem(item);
      if (mapped) {
        results.push(mapped);
      }
      if (results.length >= maxItems) {
        break;
      }
    }
    if (!parsed.data.hasMore || !parsed.data.cursor) {
      break;
    }
    cursor = parsed.data.cursor;
  }

  return results;
}

export type SitemapObjectEntry = { object_id: string };
export type SitemapUserEntry = { name: string };

export async function fetchDiscoverObjectsForSitemap(options: {
  limit?: number;
}): Promise<SitemapObjectEntry[]> {
  const limit = options.limit ?? 5000;
  return paginateDiscover<SitemapObjectEntry>(
    '/query/v1/discover/objects',
    { sort: 'rank' },
    limit,
    (item) => {
      const row = item as { object_id?: string };
      return row.object_id ? { object_id: row.object_id } : null;
    },
  );
}

export async function fetchDiscoverUsersForSitemap(options: {
  limit?: number;
}): Promise<SitemapUserEntry[]> {
  const limit = options.limit ?? 5000;
  return paginateDiscover<SitemapUserEntry>(
    '/query/v1/discover/users',
    {},
    limit,
    (item) => {
      const row = item as { name?: string };
      return row.name ? { name: row.name } : null;
    },
  );
}
