'use server';

import { getRequestLocale } from '@/i18n/runtime/get-request-locale';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

import { resolveNestedObjectContent } from '../../infrastructure/resolve-nested-object-content.server';

export async function resolveNestedObjectContentAction(objectId: string) {
  const locale = await getRequestLocale();
  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();
  return resolveNestedObjectContent(objectId, {
    locale,
    viewer: user?.username ?? null,
  });
}
