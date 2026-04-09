import 'server-only';

import { cookies } from 'next/headers';

import { env } from '@/config/env';
import { AUTH_ACCESS_COOKIE } from '@/shared/infrastructure/auth/session-cookie';
import { fail, ok, type Result } from '@/shared/domain/result';

import type { UserPostDraftListApiResponse } from './user-post-draft-api.types';

export type QueryApiDraftError =
  | { code: 'unauthorized' }
  | { code: 'http_error'; status: number }
  | { code: 'network' };

async function getAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(AUTH_ACCESS_COOKIE)?.value;
}

/**
 * Authenticated fetch to query-api (Bearer from access cookie). No Next.js HTTP cache.
 */
export async function queryApiDraftsFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<Result<T, QueryApiDraftError>> {
  const token = await getAccessToken();
  if (!token) {
    return fail({ code: 'unauthorized' });
  }
  const base = env.QUERY_API_URL.replace(/\/$/, '');
  const url = path.startsWith('http')
    ? path
    : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.body !== undefined
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...init?.headers,
      },
    });
  } catch {
    return fail({ code: 'network' });
  }
  if (res.status === 204) {
    return ok(undefined as T);
  }
  if (!res.ok) {
    return fail({ code: 'http_error', status: res.status });
  }
  const data = (await res.json()) as T;
  return ok(data);
}

function draftsListPath(
  author: string,
  query: Record<string, string | number | undefined>,
) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== '') {
      q.set(k, String(v));
    }
  }
  const qs = q.toString();
  return `/query/v1/users/${encodeURIComponent(author)}/drafts${qs ? `?${qs}` : ''}`;
}

/** Server-only list (RSC or actions). */
export async function fetchUserDraftListServer(
  author: string,
  options: { limit?: number; cursor?: string | null } = {},
): Promise<Result<UserPostDraftListApiResponse, QueryApiDraftError>> {
  return queryApiDraftsFetch<UserPostDraftListApiResponse>(
    draftsListPath(author, {
      limit: options.limit,
      cursor: options.cursor ?? undefined,
    }),
    { method: 'GET' },
  );
}
