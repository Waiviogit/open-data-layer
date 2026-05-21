import 'server-only';

import { env } from '@/config/env';

/** Uncached fetch — use only from post-broadcast server actions, not from default page-load clients. */
export const QUERY_API_LIVE_INIT = {
  cache: 'no-store' as const,
  next: { revalidate: 0 },
};

export type QueryApiFetchOptions = RequestInit & {
  /** Next.js Data Cache tags — invalidate via `revalidateTag` after on-chain mutations. */
  cacheTags?: string[];
};

/**
 * Server-only fetch to query-api.
 * Returns `null` on network failures, 404, or non-OK responses (never throws).
 * Default `next.revalidate` is 60s for GET (Data Cache); pass `cacheTags` for invalidation after broadcast.
 */
export async function queryApiFetch<T>(
  path: string,
  init?: QueryApiFetchOptions,
): Promise<T | null> {
  const { cacheTags, ...fetchInit } = init ?? {};
  const base = env.QUERY_API_URL.replace(/\/$/, '');
  const url = path.startsWith('http')
    ? path
    : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  const nextInit = fetchInit as RequestInit & {
    next?: { revalidate?: number | false; tags?: string[] };
  };
  let res: Response;
  try {
    res = await fetch(url, {
      ...fetchInit,
      next: {
        revalidate: 60,
        ...(cacheTags && cacheTags.length > 0 ? { tags: cacheTags } : {}),
        ...nextInit.next,
      },
    });
  } catch (err) {
    console.error(`[query-api] network error for ${path}:`, err);
    return null;
  }
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    console.error(`[query-api] ${res.status} for ${path}`);
    return null;
  }
  return res.json() as Promise<T>;
}

/** Uncached query-api read — **post-broadcast server actions only** (not page-load clients). */
export async function queryApiFetchLive<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  return queryApiFetch<T>(path, { ...init, ...QUERY_API_LIVE_INIT, cacheTags: undefined });
}
