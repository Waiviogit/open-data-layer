import { jwtVerify } from 'jose';

import type { CurrentUser } from '@/shared/application/current-user';

/**
 * Verifies an access JWT and maps it to {@link CurrentUser}.
 */
export async function resolveSessionUserFromAccessToken(
  accessToken: string,
  jwtSecret: string,
): Promise<CurrentUser | null> {
  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(accessToken, secret, {
      algorithms: ['HS256'],
    });
    if (payload.typ !== 'access') {
      return null;
    }
    const sub = typeof payload.sub === 'string' ? payload.sub : null;
    if (!sub) {
      return null;
    }
    return {
      id: sub,
      username: sub,
      role: 'user',
    };
  } catch {
    return null;
  }
}
