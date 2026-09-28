import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { env } from '@/config/env';
import {
  FIELD_REFERENCE_PATH_SEGMENTS,
  resolveFieldReferenceTypeFromPathSegment,
} from '@/modules/object/domain/field-reference-rules';
import {
  OBJECT_PAGE_GALLERY_ALBUM_PARAM,
  OBJECT_PAGE_GALLERY_ALBUM_PATH_SEGMENT,
  OBJECT_PAGE_CATEGORY_NAME_PARAM,
  OBJECT_PAGE_CATEGORY_PATH_SEGMENT,
  OBJECT_PAGE_FIELD_REFERENCE_TYPE_PARAM,
  OBJECT_PAGE_FIELD_REFERENCES_PATH_SEGMENT,
  OBJECT_PAGE_UPDATE_ID_PARAM,
  OBJECT_PAGE_PATH_TAB_SEGMENTS,
  OBJECT_PAGE_REVIEWS_SUB_PARAM,
  REVIEWS_FEED_PATH_SEGMENTS,
} from '@/modules/object/domain/object-page-url.constants';
import { isUserProfileReservedFirstSegment } from '@/modules/user-profile/presentation/components/profile-path';
import {
  applyProxySessionRefreshToResponse,
  refreshSessionCookiesIfNeeded,
} from '@/shared/infrastructure/auth/refresh-session';
import { AUTH_ACCESS_COOKIE } from '@/shared/infrastructure/auth/session-cookie';
import { buildPublicUrl } from '@/shared/infrastructure/http/get-public-origin';

const REQUIRE_AUTH_EXCLUDED_PREFIXES = [
  '/sign-in',
  '/has',
  '/api/auth/',
  '/images/',
] as const;

/**
 * Public `/@account/...` → App Router paths under `/user-profile/...`.
 * Post permalinks are rewritten to `/user-profile/account/post/permalink` so the modal
 * intercept route does not treat profile tabs (e.g. `threads`) as `[permlink]`.
 *
 * Config-only rewrites do not apply to client-side `<Link>` navigations; this runs on every request.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 */
export async function proxy(request: NextRequest) {
  const sessionRefresh = await refreshSessionCookiesIfNeeded(request);
  const { pathname } = request.nextUrl;

  const finish = (response: NextResponse) =>
    applyProxySessionRefreshToResponse(response, sessionRefresh);

  if (env.requireAuth) {
    const isExcluded = REQUIRE_AUTH_EXCLUDED_PREFIXES.some((prefix) =>
      pathname.startsWith(prefix),
    );
    if (!isExcluded) {
      const hasSession =
        sessionRefresh.kind === 'refreshed' ||
        (sessionRefresh.kind === 'unchanged' &&
          request.cookies.has(AUTH_ACCESS_COOKIE));
      if (!hasSession) {
        return finish(
          NextResponse.redirect(
            buildPublicUrl(request, '/sign-in', env.publicOrigin),
          ),
        );
      }
    }
  }

  /**
   * Gallery album drill-down: `/object/:id/gallery/album/:name` → `?tab=gallery&gallery_album=:name`.
   * Must run before the plain `/gallery` rewrite.
   */
  const galleryAlbumMatch = pathname.match(
    new RegExp(
      `^/object/([^/]+)/gallery/${OBJECT_PAGE_GALLERY_ALBUM_PATH_SEGMENT}/(.+)$`,
    ),
  );
  if (galleryAlbumMatch) {
    const id = galleryAlbumMatch[1];
    const albumEncoded = galleryAlbumMatch[2];
    const url = request.nextUrl.clone();
    url.pathname = `/object/${id}`;
    url.searchParams.set('tab', 'gallery');
    url.searchParams.set(OBJECT_PAGE_GALLERY_ALBUM_PARAM, albumEncoded);
    return finish(NextResponse.rewrite(url));
  }

  const categoryMatch = pathname.match(
    new RegExp(`^/object/([^/]+)/${OBJECT_PAGE_CATEGORY_PATH_SEGMENT}/(.+)$`),
  );
  if (categoryMatch) {
    const id = categoryMatch[1];
    const categoryEncoded = categoryMatch[2];
    const url = request.nextUrl.clone();
    url.pathname = `/object/${id}`;
    url.searchParams.set('tab', OBJECT_PAGE_CATEGORY_PATH_SEGMENT);
    url.searchParams.set(OBJECT_PAGE_CATEGORY_NAME_PARAM, categoryEncoded);
    return finish(NextResponse.rewrite(url));
  }

  const fieldReferencePathGroup = FIELD_REFERENCE_PATH_SEGMENTS.join('|');
  const fieldReferenceFeedMatch = pathname.match(
    new RegExp(`^/object/([^/]+)/(${fieldReferencePathGroup})/?$`),
  );
  if (fieldReferenceFeedMatch) {
    const id = fieldReferenceFeedMatch[1];
    const pathSegment = fieldReferenceFeedMatch[2];
    const referenceType = resolveFieldReferenceTypeFromPathSegment(pathSegment);
    if (referenceType != null) {
      const url = request.nextUrl.clone();
      url.pathname = `/object/${id}`;
      url.searchParams.set('tab', OBJECT_PAGE_FIELD_REFERENCES_PATH_SEGMENT);
      url.searchParams.set(OBJECT_PAGE_FIELD_REFERENCE_TYPE_PARAM, referenceType);
      return finish(NextResponse.rewrite(url));
    }
  }

  const updateDetailMatch = pathname.match(/^\/object\/([^/]+)\/updates\/([^/]+)\/?$/);
  if (updateDetailMatch) {
    const id = updateDetailMatch[1];
    const updateEncoded = updateDetailMatch[2];
    const url = request.nextUrl.clone();
    url.pathname = `/object/${id}`;
    url.searchParams.set('tab', 'updates');
    url.searchParams.set(OBJECT_PAGE_UPDATE_ID_PARAM, updateEncoded);
    return finish(NextResponse.rewrite(url));
  }

  const legacyReviewsMessagesMatch = pathname.match(
    /^\/object\/([^/]+)\/reviews\/messages\/?$/,
  );
  if (legacyReviewsMessagesMatch) {
    const id = legacyReviewsMessagesMatch[1];
    const url = request.nextUrl.clone();
    url.pathname = `/object/${id}`;
    url.searchParams.set('tab', 'reviews');
    url.searchParams.set(OBJECT_PAGE_REVIEWS_SUB_PARAM, 'activity');
    return finish(NextResponse.rewrite(url));
  }

  const reviewsSubMatch = pathname.match(
    new RegExp(`^/object/([^/]+)/reviews/(${REVIEWS_FEED_PATH_SEGMENTS.join('|')})/?$`),
  );
  if (reviewsSubMatch) {
    const id = reviewsSubMatch[1];
    const sub = reviewsSubMatch[2];
    const url = request.nextUrl.clone();
    url.pathname = `/object/${id}`;
    url.searchParams.set('tab', 'reviews');
    url.searchParams.set(OBJECT_PAGE_REVIEWS_SUB_PARAM, sub);
    return finish(NextResponse.rewrite(url));
  }

  const legacyObjectMessagesMatch = pathname.match(/^\/object\/([^/]+)\/messages\/?$/);
  if (legacyObjectMessagesMatch) {
    const id = legacyObjectMessagesMatch[1];
    const url = request.nextUrl.clone();
    url.pathname = `/object/${id}`;
    url.searchParams.set('tab', 'reviews');
    url.searchParams.set(OBJECT_PAGE_REVIEWS_SUB_PARAM, 'activity');
    return finish(NextResponse.rewrite(url));
  }

  /**
   * Public `/object/:id/<tab>` stays in the address bar; App Router serves
   * `object/[object-id]/page.tsx` with `?tab=<tab>` injected (plus any existing query).
   */
  for (const tab of OBJECT_PAGE_PATH_TAB_SEGMENTS) {
    const objectTabMatch = pathname.match(
      new RegExp(`^/object/([^/]+)/${tab}/?$`),
    );
    if (objectTabMatch) {
      const id = objectTabMatch[1];
      const url = request.nextUrl.clone();
      url.pathname = `/object/${id}`;
      url.searchParams.set('tab', tab);
      return finish(NextResponse.rewrite(url));
    }
  }

  if (!pathname.startsWith('/@')) {
    return finish(NextResponse.next());
  }

  const segments = pathname.slice(2).split('/').filter(Boolean);
  const url = request.nextUrl.clone();

  if (segments.length === 0) {
    return finish(NextResponse.next());
  }

  const account = segments[0];
  if (segments.length === 1) {
    url.pathname = `/user-profile/${account}`;
    return finish(NextResponse.rewrite(url));
  }

  const tail = segments.slice(1);
  const head = tail[0] ?? '';

  if (head !== '' && isUserProfileReservedFirstSegment(head)) {
    url.pathname = `/user-profile/${account}/${tail.join('/')}`;
    return finish(NextResponse.rewrite(url));
  }

  url.pathname = `/user-profile/${account}/post/${tail.join('/')}`;
  return finish(NextResponse.rewrite(url));
}

export const config = {
  /**
   * Skip framework assets only. Do not exclude paths merely because they contain `.` —
   * Hive account names may include dots (e.g. `@coffee.time`); those must reach {@link proxy}.
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
