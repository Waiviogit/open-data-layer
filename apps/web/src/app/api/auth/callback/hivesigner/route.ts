import { NextResponse } from 'next/server';

import { authApiUrl } from '@/shared/infrastructure/auth/bff-proxy';
import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
  DEFAULT_ACCESS_MAX_AGE_SEC,
  DEFAULT_REFRESH_MAX_AGE_SEC,
  getSessionCookieOptions,
} from '@/shared/infrastructure/auth/session-cookie';

type TokenResponse = {
  accessToken?: string;
  refreshToken?: string;
  user?: { username: string };
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const search = url.search;

  const ua = req.headers.get('user-agent');
  const res = await fetch(`${authApiUrl('/callback/hivesigner')}${search}`, {
    method: 'GET',
    headers: {
      ...(ua ? { 'user-agent': ua } : {}),
    },
  });

  const text = await res.text();
  if (!res.ok) {
    return new NextResponse(text, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') ?? 'application/json',
      },
    });
  }

  let json: TokenResponse;
  try {
    json = JSON.parse(text) as TokenResponse;
  } catch {
    return NextResponse.redirect(new URL('/?auth=error', url.origin));
  }

  const redirect = NextResponse.redirect(new URL('/?auth=ok', url.origin));
  if (json.accessToken) {
    redirect.cookies.set(
      AUTH_ACCESS_COOKIE,
      json.accessToken,
      getSessionCookieOptions(DEFAULT_ACCESS_MAX_AGE_SEC),
    );
  }
  if (json.refreshToken) {
    redirect.cookies.set(
      AUTH_REFRESH_COOKIE,
      json.refreshToken,
      getSessionCookieOptions(DEFAULT_REFRESH_MAX_AGE_SEC),
    );
  }
  return redirect;
}
