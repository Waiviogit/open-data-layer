import { NextResponse } from 'next/server';

import { authApiUrl } from '@/shared/infrastructure/auth/bff-proxy';
import { setSessionCookiesFromAuthApiResponse } from '@/shared/infrastructure/auth/set-session-on-response';
import type { AuthApiTokenResponse } from '@/shared/infrastructure/auth/session-tokens';

export async function POST(
  req: Request,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider } = await ctx.params;
  const body = await req.text();
  const ua = req.headers.get('user-agent');
  const res = await fetch(authApiUrl(`/verify/${provider}`), {
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
