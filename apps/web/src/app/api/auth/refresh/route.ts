import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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

export async function POST(req: Request) {
  let body = await req.text();
  if (!body || body === '{}') {
    const rt = (await cookies()).get(AUTH_REFRESH_COOKIE)?.value;
    if (rt) {
      body = JSON.stringify({ refreshToken: rt });
    }
  }
  const ua = req.headers.get('user-agent');
  const res = await fetch(authApiUrl('/refresh'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(ua ? { 'user-agent': ua } : {}),
    },
    body,
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
    return new NextResponse(text, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') ?? 'application/json',
      },
    });
  }

  const out = NextResponse.json(
    { user: json.user ?? { username: '' } },
    { status: 200 },
  );

  if (json.accessToken) {
    out.cookies.set(
      AUTH_ACCESS_COOKIE,
      json.accessToken,
      getSessionCookieOptions(DEFAULT_ACCESS_MAX_AGE_SEC),
    );
  }
  if (json.refreshToken) {
    out.cookies.set(
      AUTH_REFRESH_COOKIE,
      json.refreshToken,
      getSessionCookieOptions(DEFAULT_REFRESH_MAX_AGE_SEC),
    );
  }

  return out;
}
