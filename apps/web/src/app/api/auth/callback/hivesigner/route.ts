import { NextResponse } from 'next/server';

import { authApiUrl } from '@/shared/infrastructure/auth/bff-proxy';
import { setSessionCookiesFromAuthApiResponse } from '@/shared/infrastructure/auth/set-session-on-response';
import type { AuthApiTokenResponse } from '@/shared/infrastructure/auth/session-tokens';

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

  let json: AuthApiTokenResponse;
  try {
    json = JSON.parse(text) as AuthApiTokenResponse;
  } catch {
    return NextResponse.redirect(new URL('/?auth=error', url.origin));
  }

  const redirect = NextResponse.redirect(new URL('/?auth=ok', url.origin));
  setSessionCookiesFromAuthApiResponse(redirect, json);
  return redirect;
}
