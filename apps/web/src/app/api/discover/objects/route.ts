import { type NextRequest, NextResponse } from 'next/server';

import { env } from '@/config/env';
import { getRequestLocale } from '@/i18n/runtime/get-request-locale';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const base = env.QUERY_API_URL.replace(/\/$/, '');
  const url = new URL(`${base}/query/v1/discover/objects`);
  for (const [key, value] of request.nextUrl.searchParams.entries()) {
    url.searchParams.append(key, value);
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
  return new NextResponse(text, {
    status: upstream.ok ? 200 : upstream.status,
    headers: { 'Content-Type': contentType },
  });
}
