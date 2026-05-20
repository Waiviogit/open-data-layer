import { type NextRequest, NextResponse } from 'next/server';

import { env } from '@/config/env';

export const dynamic = 'force-dynamic';

/**
 * BFF: global search tab counts — proxies to query-api `GET /query/v1/search/counts`.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (!q) {
    return NextResponse.json({ error: 'Missing or empty q' }, { status: 400 });
  }

  const base = env.QUERY_API_URL.replace(/\/$/, '');
  const url = new URL(`${base}/query/v1/search/counts`);
  url.searchParams.set('q', q);

  const upstream = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
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
