import 'server-only';

import { env } from '@/config/env';

/**
 * Server-only fetch to query-api. 404 → `null`. Other errors throw.
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
  const res = await fetch(url, {
    ...init,
    next: { revalidate: 60, ...nextInit.next },
  });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`query-api ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}
