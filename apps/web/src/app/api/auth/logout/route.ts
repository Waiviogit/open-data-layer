import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { authApiUrl } from '@/shared/infrastructure/auth/bff-proxy';
import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
} from '@/shared/infrastructure/auth/session-cookie';

export async function POST(req: Request) {
  let body = await req.text();
  if (!body || body === '{}') {
    const rt = (await cookies()).get(AUTH_REFRESH_COOKIE)?.value;
    if (rt) {
      body = JSON.stringify({ refreshToken: rt });
    }
  }
  const ua = req.headers.get('user-agent');
  const res = await fetch(authApiUrl('/logout'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(ua ? { 'user-agent': ua } : {}),
    },
    body,
  });

  const text = await res.text();
  const out = new NextResponse(text, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'application/json',
    },
  });

  out.cookies.set(AUTH_ACCESS_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  out.cookies.set(AUTH_REFRESH_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });

  return out;
}
