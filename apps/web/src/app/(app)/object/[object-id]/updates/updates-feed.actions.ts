'use server';

import { getObjectUpdatesFeedPageQuery } from '@/modules/object-updates/application/queries/get-object-updates-feed-page.query';
import type { ObjectUpdatesUrlFilters } from '@/modules/object-updates/application/parse-object-updates-search-params';
import { getRequestLocale } from '@/i18n/runtime/get-request-locale';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

export async function loadMoreObjectUpdatesFeedAction(
  objectId: string,
  filters: ObjectUpdatesUrlFilters,
  cursor: string | null,
) {
  const locale = await getRequestLocale();
  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();
  return getObjectUpdatesFeedPageQuery(
    objectId,
    { filters, cursor },
    { locale, viewer: user?.username ?? null },
  );
}
