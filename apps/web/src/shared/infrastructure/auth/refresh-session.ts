import { jwtVerify } from 'jose';
import type { NextRequest, NextResponse } from 'next/server';

import { buildAuthApiUrl } from './auth-api-url';
import { shouldSkipProxySessionRefresh } from './proxy-session-paths';
import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
  DEFAULT_ACCESS_MAX_AGE_SEC,
  DEFAULT_REFRESH_MAX_AGE_SEC,
  getSessionCookieOptions,
} from './session-cookie';
import {
  parseAuthApiTokenResponse,
  type AuthApiTokenResponse,
  type SessionTokenPair,
} from './session-tokens';

export async function isAccessTokenValid(
  accessToken: string,
  jwtSecret: string,
): Promise<boolean> {
  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(accessToken, secret, {
      algorithms: ['HS256'],
    });
    return payload.typ === 'access' && typeof payload.sub === 'string';
  } catch {
    return false;
  }
}

export type FetchSessionTokenPairResult =
  | { status: 'ok'; tokens: SessionTokenPair }
  /** Refresh rejected or invalid response — caller should clear session cookies. */
  | { status: 'auth_failed' }
  /** auth-api unreachable (not running, DNS, connection refused) — do not clear cookies. */
  | { status: 'unavailable' };

export async function fetchSessionTokenPairFromAuthApi(
  refreshToken: string,
  userAgent: string | null,
  env: NodeJS.ProcessEnv = process.env,
): Promise<FetchSessionTokenPairResult> {
  let res: Response;
  try {
    res = await fetch(buildAuthApiUrl('/refresh', env), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userAgent ? { 'user-agent': userAgent } : {}),
      },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
  } catch {
    return { status: 'unavailable' };
  }

  if (!res.ok) {
    return { status: 'auth_failed' };
  }

  let json: AuthApiTokenResponse;
  try {
    json = (await res.json()) as AuthApiTokenResponse;
  } catch {
    return { status: 'auth_failed' };
  }

  const tokens = parseAuthApiTokenResponse(json);
  if (!tokens) {
    return { status: 'auth_failed' };
  }

  return { status: 'ok', tokens };
}

export type ProxySessionRefreshResult =
  | { kind: 'unchanged' }
  | { kind: 'refreshed'; tokens: SessionTokenPair }
  | { kind: 'cleared' };

/**
 * When access is missing/expired but refresh is present, exchange refresh for a new pair.
 */
export async function resolveProxySessionRefresh(
  request: NextRequest,
  jwtSecret: string,
): Promise<ProxySessionRefreshResult> {
  const refresh = request.cookies.get(AUTH_REFRESH_COOKIE)?.value?.trim();
  if (!refresh) {
    return { kind: 'unchanged' };
  }

  const access = request.cookies.get(AUTH_ACCESS_COOKIE)?.value?.trim();
  if (access && (await isAccessTokenValid(access, jwtSecret))) {
    return { kind: 'unchanged' };
  }

  const ua = request.headers.get('user-agent');
  const result = await fetchSessionTokenPairFromAuthApi(refresh, ua);
  if (result.status === 'unavailable') {
    return { kind: 'unchanged' };
  }
  if (result.status === 'auth_failed') {
    return { kind: 'cleared' };
  }

  return { kind: 'refreshed', tokens: result.tokens };
}

export function applySessionTokensToResponse(
  response: NextResponse,
  tokens: SessionTokenPair,
): void {
  response.cookies.set(
    AUTH_ACCESS_COOKIE,
    tokens.accessToken,
    getSessionCookieOptions(DEFAULT_ACCESS_MAX_AGE_SEC),
  );
  response.cookies.set(
    AUTH_REFRESH_COOKIE,
    tokens.refreshToken,
    getSessionCookieOptions(DEFAULT_REFRESH_MAX_AGE_SEC),
  );
}

export function clearSessionCookiesOnResponse(response: NextResponse): void {
  response.cookies.set(AUTH_ACCESS_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
  });
  response.cookies.set(AUTH_REFRESH_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
  });
}

export async function refreshSessionCookiesIfNeeded(
  request: NextRequest,
): Promise<ProxySessionRefreshResult> {
  const jwtSecret = process.env.AUTH_JWT_SECRET?.trim();
  if (!jwtSecret || jwtSecret.length < 16) {
    return { kind: 'unchanged' };
  }

  if (shouldSkipProxySessionRefresh(request.nextUrl.pathname)) {
    return { kind: 'unchanged' };
  }

  return resolveProxySessionRefresh(request, jwtSecret);
}

export function applyProxySessionRefreshToResponse(
  response: NextResponse,
  refreshResult: ProxySessionRefreshResult,
): NextResponse {
  if (refreshResult.kind === 'refreshed') {
    applySessionTokensToResponse(response, refreshResult.tokens);
  } else if (refreshResult.kind === 'cleared') {
    clearSessionCookiesOnResponse(response);
  }
  return response;
}
