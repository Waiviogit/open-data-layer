import 'server-only';

import { cookies } from 'next/headers';

import { env } from '@/config/env';
import { AUTH_ACCESS_COOKIE } from '@/shared/infrastructure/auth/session-cookie';

export type EditorDraftLoadResult = {
  draftId: string;
  title: string;
  body: string;
  permlink: string | null;
  lastUpdated: number;
};

/**
 * Loads a user post draft from query-api for the editor (same JWT as session cookie).
 * Pass exactly one of `permlink` or `draftId`.
 */
export async function fetchUserPostDraftForEditor(
  author: string,
  options: { permlink: string } | { draftId: string },
): Promise<EditorDraftLoadResult | null> {
  const token = (await cookies()).get(AUTH_ACCESS_COOKIE)?.value;
  if (!token) {
    return null;
  }
  const base = env.QUERY_API_URL.replace(/\/$/, '');
  const q =
    'permlink' in options
      ? `permlink=${encodeURIComponent(options.permlink)}`
      : `draftId=${encodeURIComponent(options.draftId)}`;
  const url = `${base}/query/v1/users/${encodeURIComponent(author)}/drafts?${q}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as {
      draftId?: unknown;
      title?: unknown;
      body?: unknown;
      permlink?: unknown;
      lastUpdated?: unknown;
    };
    const draftId = typeof data.draftId === 'string' ? data.draftId : '';
    if (!draftId) {
      return null;
    }
    const title = typeof data.title === 'string' ? data.title : '';
    const body = typeof data.body === 'string' ? data.body : '';
    const permlink =
      data.permlink === null
        ? null
        : typeof data.permlink === 'string'
          ? data.permlink
          : null;
    const lastUpdated =
      typeof data.lastUpdated === 'number' ? data.lastUpdated : 0;
    return { draftId, title, body, permlink, lastUpdated };
  } catch {
    return null;
  }
}
