import 'server-only';

import { env } from '@/config/env';

/**
 * Server-only fetch to query-api.
 * Returns `null` on network failures, 404, or non-OK responses (never throws).
 * Default `next.revalidate` is 60s; override via `init.next`.
 */
export async function queryApiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  const base = env.QUERY_API_URL.replace(/\/$/, '');
  const url = path.startsWith('http')
    ? path
    : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  const nextInit = (init ?? {}) as RequestInit & {
    next?: { revalidate?: number | false; tags?: string[] };
  };
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      next: { revalidate: 60, ...nextInit.next },
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
