import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { authApiUrl } from '@/shared/infrastructure/auth/bff-proxy';
import { AUTH_REFRESH_COOKIE } from '@/shared/infrastructure/auth/session-cookie';
import { setSessionCookiesFromAuthApiResponse } from '@/shared/infrastructure/auth/set-session-on-response';
import type { AuthApiTokenResponse } from '@/shared/infrastructure/auth/session-tokens';

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

  let json: AuthApiTokenResponse;
  try {
    json = JSON.parse(text) as AuthApiTokenResponse;
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

  setSessionCookiesFromAuthApiResponse(out, json);

  return out;
}
