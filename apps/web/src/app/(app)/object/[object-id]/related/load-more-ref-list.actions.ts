'use server';

import {
  fetchObjectRefList,
  REF_LIST_PAGE_SIZE,
  type ObjectRefListPageView,
  type ObjectRefRelation,
} from '@/modules/object/infrastructure/object-ref-list.client';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';
import { getRequestLocale } from '@/i18n/runtime/get-request-locale';

export async function loadMoreObjectRefListAction(
  objectId: string,
  relation: ObjectRefRelation,
  cursor: string | null,
): Promise<ObjectRefListPageView> {
  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();
  const locale = await getRequestLocale();
  const page = await fetchObjectRefList(
    objectId,
    relation,
    { limit: REF_LIST_PAGE_SIZE, cursor },
    { locale, viewer: user?.username ?? null },
  );
  return page ?? { items: [], hasMore: false, cursor: null };
}
