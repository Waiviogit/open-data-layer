import 'server-only';

import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import {
  getRequiredUserFromProvider,
  type AuthContextProvider,
} from '@/shared/application/auth-context';
import type { CurrentUser } from '@/shared/application/current-user';
import { env } from '@/config/env';
import { AUTH_ACCESS_COOKIE } from './session-cookie';

/**
 * Resolves {@link CurrentUser} from the httpOnly access JWT set by the auth BFF.
 */
export function createCookieAuthContextProvider(): AuthContextProvider {
  const provider: AuthContextProvider = {
    async getUser(): Promise<CurrentUser | null> {
      if (!env.AUTH_JWT_SECRET) {
        return null;
      }
      const store = await cookies();
      const token = store.get(AUTH_ACCESS_COOKIE)?.value;
      if (!token) {
        return null;
      }
      try {
        const secret = new TextEncoder().encode(env.AUTH_JWT_SECRET);
        const { payload } = await jwtVerify(token, secret, {
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
    },
    async getRequiredUser(): Promise<CurrentUser> {
      return getRequiredUserFromProvider(provider);
    },
  };
  return provider;
}
