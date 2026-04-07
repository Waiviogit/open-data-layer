import { NextResponse } from 'next/server';

import { authApiUrl } from '@/shared/infrastructure/auth/bff-proxy';

export async function POST(req: Request) {
  const body = await req.text();
  const ua = req.headers.get('user-agent');
  const res = await fetch(authApiUrl('/challenge'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(ua ? { 'user-agent': ua } : {}),
    },
    body,
  });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  });
}
