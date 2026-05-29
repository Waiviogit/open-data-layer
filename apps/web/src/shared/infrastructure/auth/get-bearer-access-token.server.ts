import 'server-only';

import { cookies } from 'next/headers';

import { AUTH_ACCESS_COOKIE } from './session-cookie';

export async function getBearerAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(AUTH_ACCESS_COOKIE)?.value;
}
