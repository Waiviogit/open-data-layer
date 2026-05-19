import 'server-only';

import { cookies } from 'next/headers';
import {
  getRequiredUserFromProvider,
  type AuthContextProvider,
} from '@/shared/application/auth-context';
import type { CurrentUser } from '@/shared/application/current-user';
import { env } from '@/config/env';
import { AUTH_ACCESS_COOKIE } from './session-cookie';
import { resolveSessionUserFromAccessToken } from './resolve-session-user';

/**
 * Resolves {@link CurrentUser} from the httpOnly access JWT set by the auth BFF.
 * Silent refresh runs in {@link proxy} before RSC; this reads the (possibly renewed) cookie.
 */
export function createCookieAuthContextProvider(): AuthContextProvider {
  const provider: AuthContextProvider = {
    async getUser(): Promise<CurrentUser | null> {
      if (!env.AUTH_JWT_SECRET) {
        return null;
      }
      const store = await cookies();
      const token = store.get(AUTH_ACCESS_COOKIE)?.value?.trim();
      if (!token) {
        return null;
      }
      return resolveSessionUserFromAccessToken(token, env.AUTH_JWT_SECRET);
    },
    async getRequiredUser(): Promise<CurrentUser> {
      return getRequiredUserFromProvider(provider);
    },
  };
  return provider;
}
