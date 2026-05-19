import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { env } from '@/config/env';
import { AUTH_ACCESS_COOKIE } from '@/shared/infrastructure/auth/session-cookie';

export async function GET() {
  if (!env.AUTH_JWT_SECRET) {
    return NextResponse.json({ error: 'auth_not_configured' }, { status: 503 });
  }

  const store = await cookies();
  const token = store.get(AUTH_ACCESS_COOKIE)?.value?.trim();
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ token });
}
