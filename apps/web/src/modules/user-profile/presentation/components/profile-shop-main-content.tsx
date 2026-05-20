import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

import { getCategoryNav } from '../../infrastructure/clients/categories.client';
import { getShopObjectsQuery } from '../../application/queries/get-shop-objects.query';
import { getShopSectionsQuery } from '../../application/queries/get-shop-sections.query';
import { apiNavContextFromLineage, UNCATEGORIZED_SHOP_PATH_SEGMENT } from './category-nav-path';
import { ShopObjectList } from './shop-object-list';
import { ShopSections } from './shop-sections';

export type ProfileShopMainContentProps = {
  accountName: string;
  types: readonly string[];
  basePath: string;
  lineageSegments: string[];
};

/**
 * Resolves category nav for the current URL; leaf routes render an infinite object list,
 * intermediate routes render section groups (child categories × preview objects).
 */
export async function ProfileShopMainContent({
  accountName,
  types,
  basePath,
  lineageSegments,
}: ProfileShopMainContentProps) {
  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();
  const viewerUsername = user?.username ?? null;

  if (
    lineageSegments.length === 1 &&
    lineageSegments[0] === UNCATEGORIZED_SHOP_PATH_SEGMENT
  ) {
    const page = await getShopObjectsQuery(
      accountName,
      {
        types,
        categoryPath: [],
        uncategorizedOnly: true,
        limit: 20,
      },
      viewerUsername,
    );
    return (
      <ShopObjectList
        accountName={accountName}
        initialPage={page}
        types={types}
        categoryPath={[]}
        uncategorizedOnly
        viewerUsername={viewerUsername}
      />
    );
  }

  const { parentName, path } = apiNavContextFromLineage(lineageSegments);
  const nav = await getCategoryNav(accountName, types, {
    name: parentName,
    path,
  });
  const isLeaf = nav === null || nav.items.length === 0;

  if (isLeaf) {
    const page = await getShopObjectsQuery(
      accountName,
      {
        types,
        categoryPath: lineageSegments,
        limit: 20,
      },
      viewerUsername,
    );
    return (
      <ShopObjectList
        accountName={accountName}
        initialPage={page}
        types={types}
        categoryPath={lineageSegments}
        viewerUsername={viewerUsername}
      />
    );
  }

  const sections = await getShopSectionsQuery(
    accountName,
    {
      types,
      name: parentName,
      path,
      sectionLimit: 3,
    },
    viewerUsername,
  );

  return (
    <ShopSections
      accountName={accountName}
      initialSections={sections}
      types={types}
      basePath={basePath}
      lineageSegments={lineageSegments}
      navName={parentName}
      navPath={path}
      viewerUsername={viewerUsername}
    />
  );
}
