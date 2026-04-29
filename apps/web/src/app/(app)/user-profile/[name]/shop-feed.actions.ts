'use server';

import { getShopObjectsQuery } from '@/modules/user-profile/application/queries/get-shop-objects.query';
import { getShopSectionsQuery } from '@/modules/user-profile/application/queries/get-shop-sections.query';
import type { ShopObjectsPage, ShopSectionsPage } from '@/modules/user-profile/domain/types/shop-objects';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

export async function loadMoreShopObjectsAction(
  accountName: string,
  types: string[],
  categoryPath: string[],
  cursor: string,
  uncategorizedOnly?: boolean,
): Promise<ShopObjectsPage> {
  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();
  return getShopObjectsQuery(
    accountName,
    {
      types,
      categoryPath,
      cursor,
      limit: 20,
      uncategorizedOnly: uncategorizedOnly === true ? true : undefined,
    },
    user?.username ?? null,
  );
}

export async function loadMoreShopSectionsAction(
  accountName: string,
  types: string[],
  navName: string | undefined,
  navPath: string[],
  cursor: string,
): Promise<ShopSectionsPage> {
  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();
  const name = navName?.trim();
  return getShopSectionsQuery(
    accountName,
    {
      types,
      name: name && name.length > 0 ? name : undefined,
      path: navPath,
      cursor,
      sectionLimit: 3,
    },
    user?.username ?? null,
  );
}
