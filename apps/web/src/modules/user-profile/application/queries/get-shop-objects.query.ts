import 'server-only';

import type { ShopObjectsPage } from '../../domain/types/shop-objects';
import { fetchShopObjects, type FetchShopObjectsParams } from '../../infrastructure/clients/shop-objects.client';

export async function getShopObjectsQuery(
  accountName: string,
  params: FetchShopObjectsParams,
  viewer?: string | null,
): Promise<ShopObjectsPage> {
  const page = await fetchShopObjects(accountName, params, { viewer });
  return page ?? { items: [], cursor: null, hasMore: false };
}
