import { type NextRequest, NextResponse } from 'next/server';

import { env } from '@/config/env';
import { getRequestLocale } from '@/i18n/runtime/get-request-locale';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

export const dynamic = 'force-dynamic';

/**
 * BFF: predictive search — proxies to query-api with session viewer and request locale.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (!q) {
    return NextResponse.json({ error: 'Missing or empty q' }, { status: 400 });
  }

  const limitRaw = request.nextUrl.searchParams.get('limit');
  const base = env.QUERY_API_URL.replace(/\/$/, '');
  const url = new URL(`${base}/query/v1/search`);
  url.searchParams.set('q', q);
  if (limitRaw != null && limitRaw.trim() !== '') {
    url.searchParams.set('limit', limitRaw.trim());
  }

  const typeRaw = request.nextUrl.searchParams.get('type');
  if (typeRaw === 'users' || typeRaw === 'objects') {
    url.searchParams.set('type', typeRaw);
  }

  const [locale, user] = await Promise.all([
    getRequestLocale(),
    createCookieAuthContextProvider().getUser(),
  ]);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Language': locale,
    'X-Locale': locale,
  };

  const viewer = user?.username?.trim();
  if (viewer) {
    headers['X-Viewer'] = viewer;
  }

  const upstream = await fetch(url.toString(), {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  const text = await upstream.text();
  const contentType = upstream.headers.get('content-type') ?? 'application/json';

  if (!upstream.ok) {
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'Content-Type': contentType },
    });
  }

  return new NextResponse(text, {
    status: 200,
    headers: { 'Content-Type': contentType },
  });
}
