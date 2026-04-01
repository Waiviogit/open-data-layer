import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Rewrites public `/@account/...` URLs to internal `/user-profile/account/...`.
 * Browser URL stays `/@...` (rewrite, not redirect).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/@')) {
    return NextResponse.next();
  }

  // Avoid treating bare `/` or unrelated paths; require at least `/@name`
  const afterAt = pathname.slice(2);
  if (afterAt.length === 0) {
    return NextResponse.next();
  }

  const firstSegment = afterAt.split('/')[0] ?? '';
  if (!firstSegment) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/user-profile/${afterAt}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico|.*\\..*).*)'],
};
