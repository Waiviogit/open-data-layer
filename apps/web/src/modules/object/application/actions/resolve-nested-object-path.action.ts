'use server';

import { getRequestLocale } from '@/i18n/runtime/get-request-locale';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

import { resolveNestedObjectPath } from '../../infrastructure/resolve-nested-object-content.server';

export async function resolveNestedObjectPathAction(pathIds: string[]) {
  const locale = await getRequestLocale();
  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();
  return resolveNestedObjectPath(pathIds, {
    locale,
    viewer: user?.username ?? null,
  });
}
