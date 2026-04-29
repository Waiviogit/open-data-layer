import { Injectable } from '@nestjs/common';
import type { AggregatedObject } from '@opden-data-layer/objects-domain';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import {
  AggregatedObjectRepository,
  ObjectCategoriesRepository,
  UserMetadataRepository,
  UserShopDeselectRepository,
} from '../../repositories';
import { ObjectProjectionService } from '../object-projection';
import type { ProjectedObject } from '../object-projection/projected-object.types';
import { SHOP_CARD_UPDATE_TYPES } from './shop.constants';
import type { ShopObjectsQuery } from './shop.schema';
import { shouldHidePostLinkedObjects } from './shop-visibility';

export type ShopObjectsResponse = {
  items: ProjectedObject[];
  cursor: string | null;
  hasMore: boolean;
};

function orderAggregatedByIds(objects: AggregatedObject[], objectIds: string[]): AggregatedObject[] {
  const map = new Map(objects.map((o) => [o.core.object_id, o]));
  return objectIds.map((id) => map.get(id)).filter((o): o is AggregatedObject => o != null);
}

@Injectable()
export class GetUserShopObjectsEndpoint {
  constructor(
    private readonly userMetadataRepo: UserMetadataRepository,
    private readonly shopDeselectRepo: UserShopDeselectRepository,
    private readonly objectCategoriesRepo: ObjectCategoriesRepository,
    private readonly aggregatedObjectRepo: AggregatedObjectRepository,
    private readonly objectViewService: ObjectViewService,
    private readonly objectProjection: ObjectProjectionService,
  ) {}

  async execute(
    username: string,
    query: ShopObjectsQuery,
    locale: string,
    governanceObjectIdFromHeader: string | undefined,
    viewerAccount: string | undefined,
  ): Promise<ShopObjectsResponse | null> {
    const name = username.trim();
    if (name.length === 0) {
      return null;
    }

    const [flags, deselectIds] = await Promise.all([
      this.userMetadataRepo.findShopVisibilityFlags(name),
      this.shopDeselectRepo.findObjectIdsByAccount(name),
    ]);

    const hideLinked = shouldHidePostLinkedObjects(query.types, flags);

    const page = await this.objectCategoriesRepo.findObjectIdsByScope({
      username: name,
      types: query.types,
      categoryPath: query.categoryPath,
      uncategorizedOnly: query.uncategorizedOnly,
      limit: query.limit,
      cursor: query.cursor ?? null,
      hideLinkedObjects: hideLinked,
      shopDeselectObjectIds: deselectIds,
    });

    if (page.objectIds.length === 0) {
      return { items: [], cursor: null, hasMore: false };
    }

    const { objects, voterReputations } = await this.aggregatedObjectRepo.loadByObjectIds(
      page.objectIds,
    );
    const ordered = orderAggregatedByIds(objects, page.objectIds);
    const views = this.objectViewService.resolve(ordered, voterReputations, {
      update_types: [...SHOP_CARD_UPDATE_TYPES],
      locale,
      include_rejected: false,
    });

    const projected = await this.objectProjection.batchProject(views, {
      locale,
      includeSeo: false,
      governanceObjectIdFromHeader,
      viewerAccount,
    });

    return {
      items: projected,
      cursor: page.nextCursor,
      hasMore: page.hasMore,
    };
  }
}
