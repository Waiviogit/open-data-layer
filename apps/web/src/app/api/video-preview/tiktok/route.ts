import { type NextRequest, NextResponse } from 'next/server';

import { safeFetch } from '@/shared/infrastructure/http/safe-fetch.server';
import {
  isAllowedTikTokThumbnailUrl,
  tiktokOembedPageUrl,
} from '@/shared/infrastructure/tiktok-preview';
import { isTikTokVideoId } from '@/shared/infrastructure/video-preview';

const CACHE_TTL_TIKTOK_THUMB_SEC = 3600;
const TIKTOK_OEMBED_TIMEOUT_MS = 5000;

function thumbnailFromOembed(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const thumb = (body as { thumbnail_url?: unknown }).thumbnail_url;
  if (typeof thumb !== 'string') {
    return null;
  }
  const trimmed = thumb.trim();
  if (trimmed === '' || !isAllowedTikTokThumbnailUrl(trimmed)) {
    return null;
  }
  return trimmed;
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')?.trim() ?? '';
  if (!isTikTokVideoId(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(tiktokOembedPageUrl(id))}`;
  const fetched = await safeFetch(oembedUrl, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Waivio/1.0 (video-preview)',
    },
    signal: AbortSignal.timeout(TIKTOK_OEMBED_TIMEOUT_MS),
  });
  if (!fetched.ok) {
    return NextResponse.json({ error: 'unavailable' }, { status: 502 });
  }
  if (!fetched.response.ok) {
    const status = fetched.response.status === 404 ? 404 : 502;
    return NextResponse.json({ error: 'unavailable' }, { status });
  }

  let payload: unknown;
  try {
    payload = await fetched.response.json();
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 502 });
  }

  const thumbnailUrl = thumbnailFromOembed(payload);
  if (!thumbnailUrl) {
    return NextResponse.json({ error: 'unavailable' }, { status: 502 });
  }

  return NextResponse.json(
    { thumbnailUrl },
    {
      headers: {
        'Cache-Control': `public, max-age=${CACHE_TTL_TIKTOK_THUMB_SEC}`,
      },
    },
  );
}
