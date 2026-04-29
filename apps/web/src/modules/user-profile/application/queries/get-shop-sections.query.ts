import 'server-only';

import type { ShopSectionsPage } from '../../domain/types/shop-objects';
import { fetchShopSections, type FetchShopSectionsParams } from '../../infrastructure/clients/shop-objects.client';

export async function getShopSectionsQuery(
  accountName: string,
  params: FetchShopSectionsParams,
  viewer?: string | null,
): Promise<ShopSectionsPage> {
  const page = await fetchShopSections(accountName, params, { viewer });
  return page ?? { sections: [], cursor: null, hasMore: false };
}
