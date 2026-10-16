import 'server-only';

import { headers } from 'next/headers';

import { env } from '@/config/env';
import {
  getClientIpForwardHeaders,
  mergeForwardClientIpInit,
} from '@/shared/infrastructure/http/client-ip-forward-headers';

/** Uncached fetch — use for live wallet/swap reads and post-broadcast refresh. */
export const QUERY_API_LIVE_INIT = {
  cache: 'no-store' as const,
};

export type QueryApiFetchOptions = RequestInit & {
  /** Next.js Data Cache tags — invalidate via `revalidateTag` after on-chain mutations. */
  cacheTags?: string[];
  /**
   * When true, copy incoming `X-Forwarded-For` onto the upstream request.
   * Calls `headers()` — do not set on cached RSC fetches.
   */
  forwardClientIp?: boolean;
};

export type QueryApiFetchOutcome<T> =
  | { ok: true; data: T }
  | { ok: false; status: number | 'network' };

type NextFetchConfig = {
  revalidate?: number | false;
  tags?: string[];
};

function buildNextFetchConfig(
  fetchInit: RequestInit,
  cacheTags?: string[],
): NextFetchConfig | undefined {
  const callerNext = (fetchInit as RequestInit & { next?: NextFetchConfig }).next;
  const tags =
    cacheTags && cacheTags.length > 0 ? { tags: cacheTags } : undefined;

  if (fetchInit.cache === 'no-store') {
    if (!callerNext && !tags) {
      return undefined;
    }
    const { revalidate: _ignored, ...restCallerNext } = callerNext ?? {};
    const merged = { ...restCallerNext, ...tags };
    return Object.keys(merged).length > 0 ? merged : undefined;
  }

  return {
    revalidate: 60,
    ...tags,
    ...callerNext,
  };
}

function buildQueryApiFetchInit(
  fetchInit: RequestInit,
  cacheTags?: string[],
): RequestInit {
  const { next: _ignoredNext, ...restFetchInit } = fetchInit as RequestInit & {
    next?: NextFetchConfig;
  };
  const next = buildNextFetchConfig(fetchInit, cacheTags);
  return next ? { ...restFetchInit, next } : restFetchInit;
}

/**
 * Server-only fetch with HTTP status — use when callers must distinguish 503 from 404.
 */
export async function queryApiFetchOutcome<T>(
  path: string,
  init?: QueryApiFetchOptions,
): Promise<QueryApiFetchOutcome<T>> {
  const { cacheTags, forwardClientIp, ...fetchInit } = init ?? {};
  const base = env.QUERY_API_URL.replace(/\/$/, '');
  const url = path.startsWith('http')
    ? path
    : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  const extra =
    forwardClientIp === true
      ? getClientIpForwardHeaders(await headers())
      : {};
  const withIp = mergeForwardClientIpInit(
    fetchInit,
    forwardClientIp,
    extra,
  );
  let res: Response;
  try {
    res = await fetch(url, buildQueryApiFetchInit(withIp, cacheTags));
  } catch (err) {
    console.error(`[query-api] network error for ${path}:`, err);
    return { ok: false, status: 'network' };
  }
  if (!res.ok) {
    if (res.status !== 404) {
      console.error(`[query-api] ${res.status} for ${path}`);
    }
    return { ok: false, status: res.status };
  }
  try {
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (err) {
    console.error(`[query-api] invalid JSON for ${path}:`, err);
    return { ok: false, status: res.status };
  }
}

/**
 * Server-only fetch to query-api.
 * Returns `null` on network failures, 404, or non-OK responses (never throws).
 * Default `next.revalidate` is 60s for GET (Data Cache); pass `cacheTags` for invalidation after broadcast.
 */
export async function queryApiFetch<T>(
  path: string,
  init?: QueryApiFetchOptions,
): Promise<T | null> {
  const { cacheTags, forwardClientIp, ...fetchInit } = init ?? {};
  const base = env.QUERY_API_URL.replace(/\/$/, '');
  const url = path.startsWith('http')
    ? path
    : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  const extra =
    forwardClientIp === true
      ? getClientIpForwardHeaders(await headers())
      : {};
  const withIp = mergeForwardClientIpInit(
    fetchInit,
    forwardClientIp,
    extra,
  );
  let res: Response;
  try {
    res = await fetch(url, buildQueryApiFetchInit(withIp, cacheTags));
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
  try {
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[query-api] invalid JSON for ${path}:`, err);
    return null;
  }
}

/** Uncached query-api read — **post-broadcast server actions only** (not page-load clients). */
export async function queryApiFetchLive<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  return queryApiFetch<T>(path, { ...init, ...QUERY_API_LIVE_INIT, cacheTags: undefined });
}
