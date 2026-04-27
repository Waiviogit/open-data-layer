import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { isUserProfileReservedFirstSegment } from '@/modules/user-profile/presentation/components/profile-path';

/**
 * Public `/@account/...` → App Router paths under `/user-profile/...`.
 * Post permalinks are rewritten to `/user-profile/account/post/permalink` so the modal
 * intercept route does not treat profile tabs (e.g. `threads`) as `[permlink]`.
 *
 * Config-only rewrites do not apply to client-side `<Link>` navigations; this runs on every request.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/@')) {
    return NextResponse.next();
  }

  const segments = pathname.slice(2).split('/').filter(Boolean);
  const url = request.nextUrl.clone();

  if (segments.length === 0) {
    return NextResponse.next();
  }

  const account = segments[0];
  if (segments.length === 1) {
    url.pathname = `/user-profile/${account}`;
    return NextResponse.rewrite(url);
  }

  const tail = segments.slice(1);
  const head = tail[0] ?? '';

  if (head !== '' && isUserProfileReservedFirstSegment(head)) {
    url.pathname = `/user-profile/${account}/${tail.join('/')}`;
    return NextResponse.rewrite(url);
  }

  url.pathname = `/user-profile/${account}/post/${tail.join('/')}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
