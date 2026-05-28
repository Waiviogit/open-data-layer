import { type NextRequest, NextResponse } from 'next/server';

import { env } from '@/config/env';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const objectType = request.nextUrl.searchParams.get('object_type')?.trim();
  if (!objectType) {
    return NextResponse.json({ error: 'Missing object_type' }, { status: 400 });
  }

  const base = env.QUERY_API_URL.replace(/\/$/, '');
  const url = new URL(`${base}/query/v1/discover/tag-categories`);
  url.searchParams.set('object_type', objectType);
  for (const tag of request.nextUrl.searchParams.getAll('tags')) {
    const trimmed = tag.trim();
    if (trimmed) {
      url.searchParams.append('tags', trimmed);
    }
  }

  const upstream = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const text = await upstream.text();
  const contentType = upstream.headers.get('content-type') ?? 'application/json';
  return new NextResponse(text, {
    status: upstream.ok ? 200 : upstream.status,
    headers: { 'Content-Type': contentType },
  });
}
