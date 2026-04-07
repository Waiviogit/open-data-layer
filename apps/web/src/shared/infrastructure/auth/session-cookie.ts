import 'server-only';

/** httpOnly access JWT (matches auth-api access token). */
export const AUTH_ACCESS_COOKIE = 'odl_access';

/** httpOnly refresh JWT. */
export const AUTH_REFRESH_COOKIE = 'odl_refresh';

export function getSessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: maxAgeSeconds,
  };
}

/** Default refresh cookie lifetime (7 days), aligned with typical refresh JWT. */
export const DEFAULT_REFRESH_MAX_AGE_SEC = 60 * 60 * 24 * 7;

/** Default access cookie lifetime (15 minutes). */
export const DEFAULT_ACCESS_MAX_AGE_SEC = 60 * 15;
