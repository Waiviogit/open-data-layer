import { type NextRequest, NextResponse } from 'next/server';

import { env } from '@/config/env';
import { getRequestLocale } from '@/i18n/runtime/get-request-locale';
import { getClientIpForwardHeaders } from '@/shared/infrastructure/http/client-ip-forward-headers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ 'object-id': string }> },
) {
  const { 'object-id': objectId } = await context.params;
  const locale = await getRequestLocale();
  const base = env.QUERY_API_URL.replace(/\/$/, '');
  const url = new URL(
    `${base}/query/v1/objects/${encodeURIComponent(objectId)}/instacart-link`,
  );
  const country = request.nextUrl.searchParams.get('country');
  if (country) {
    url.searchParams.set('country', country);
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Language': locale,
    'X-Locale': locale,
    ...getClientIpForwardHeaders(request.headers),
  };

  const upstream = await fetch(url.toString(), {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  const text = await upstream.text();
  const contentType = upstream.headers.get('content-type') ?? 'application/json';
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'Content-Type': contentType },
  });
}
