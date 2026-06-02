import 'server-only';

import { cache } from 'react';

import type { CurrentUser } from '@/shared/application/current-user';

import { createCookieAuthContextProvider } from './cookie-auth-context-provider';

/** Dedupes session resolution within one RSC request (layout, pages, metadata). */
export const getRequestUser = cache(async (): Promise<CurrentUser | null> => {
  const auth = createCookieAuthContextProvider();
  return auth.getUser();
});
