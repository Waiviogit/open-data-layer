import type { CurrentUser } from './current-user';
import { UnauthorizedError } from '../domain';

/**
 * Port: resolve the current user without coupling domain to cookies/sessions/JWT.
 * Implementations live in shared/infrastructure/auth (or feature infrastructure).
 *
 * @see docs/apps/web/spec/architecture.md
 */
export interface AuthContextProvider {
  getUser(): Promise<CurrentUser | null>;
  getRequiredUser(): Promise<CurrentUser>;
}

/**
 * Default helper for implementations: throw when no session.
 */
export async function getRequiredUserFromProvider(
  provider: AuthContextProvider,
): Promise<CurrentUser> {
  const user = await provider.getUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}
