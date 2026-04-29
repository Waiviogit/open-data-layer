import { Injectable } from '@nestjs/common';
import type { AggregatedObject } from '@opden-data-layer/objects-domain';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import {
  AggregatedObjectRepository,
  ObjectCategoriesRelatedRepository,
  ObjectCategoriesRepository,
  UserMetadataRepository,
  UserShopDeselectRepository,
} from '../../repositories';
import { buildUserCategoriesResponse } from '../categories/build-user-categories-response';
import type { UserCategoriesQuery } from '../categories/categories-query.schema';
import { ObjectProjectionService } from '../object-projection';
import type { ProjectedObject } from '../object-projection/projected-object.types';
import { SHOP_CARD_UPDATE_TYPES, SHOP_SECTION_OBJECTS_PER_CATEGORY } from './shop.constants';
import type { ShopSectionsQuery } from './shop.schema';
import { shouldHidePostLinkedObjects } from './shop-visibility';

export type ShopSectionEntry = {
  categoryName: string;
  items: ProjectedObject[];
  totalObjects: number;
};

export type ShopSectionsResponse = {
  sections: ShopSectionEntry[];
  cursor: string | null;
  hasMore: boolean;
};

function orderAggregatedByIds(objects: AggregatedObject[], objectIds: string[]): AggregatedObject[] {
  const map = new Map(objects.map((o) => [o.core.object_id, o]));
  return objectIds.map((id) => map.get(id)).filter((o): o is AggregatedObject => o != null);
}

@Injectable()
export class GetUserShopSectionsEndpoint {
  constructor(
    private readonly userMetadataRepo: UserMetadataRepository,
    private readonly shopDeselectRepo: UserShopDeselectRepository,
    private readonly objectCategoriesRelatedRepo: ObjectCategoriesRelatedRepository,
    private readonly objectCategoriesRepo: ObjectCategoriesRepository,
    private readonly aggregatedObjectRepo: AggregatedObjectRepository,
    private readonly objectViewService: ObjectViewService,
    private readonly objectProjection: ObjectProjectionService,
  ) {}

  async execute(
    username: string,
    query: ShopSectionsQuery,
    locale: string,
    governanceObjectIdFromHeader: string | undefined,
    viewerAccount: string | undefined,
  ): Promise<ShopSectionsResponse | null> {
    const name = username.trim();
    if (name.length === 0) {
      return null;
    }

    const [flags, deselectIds, relatedRows] = await Promise.all([
      this.userMetadataRepo.findShopVisibilityFlags(name),
      this.shopDeselectRepo.findObjectIdsByAccount(name),
      this.objectCategoriesRelatedRepo.findByUserScope(name, query.types),
    ]);

    const hideLinked = shouldHidePostLinkedObjects(query.types, flags);

    const navQuery: UserCategoriesQuery = {
      types: query.types,
      name: query.name,
      path: query.path,
      excluded: [],
    };
    const nav = buildUserCategoriesResponse(relatedRows, navQuery);
    const ordered = nav.items;

    let start = 0;
    const cursor = query.cursor?.trim();
    if (cursor && cursor.length > 0) {
      const idx = ordered.findIndex((it) => it.name === cursor);
      start = idx >= 0 ? idx + 1 : 0;
    }

    const pageItems = ordered.slice(start, start + query.sectionLimit);
    const hasMore = start + pageItems.length < ordered.length;

    if (pageItems.length === 0) {
      return { sections: [], cursor: null, hasMore: false };
    }

    const nameSeg = query.name?.trim() ?? '';
    const parentPathForSamples = nameSeg.length > 0 ? [...(query.path ?? []), nameSeg] : [];

    const categoryNames = pageItems.map((p) => p.name);
    const idsByCategory = await this.objectCategoriesRepo.findObjectIdsByScopeForCategories({
      username: name,
      types: query.types,
      categoryNames,
      parentPath: parentPathForSamples,
      objectsPerCategory: SHOP_SECTION_OBJECTS_PER_CATEGORY,
      hideLinkedObjects: hideLinked,
      shopDeselectObjectIds: deselectIds,
    });

    const allIdsOrdered: string[] = [];
    for (const cn of categoryNames) {
      for (const id of idsByCategory.get(cn) ?? []) {
        allIdsOrdered.push(id);
      }
    }
    const uniqueIds = [...new Set(allIdsOrdered)];

    const { objects, voterReputations } = await this.aggregatedObjectRepo.loadByObjectIds(uniqueIds);
    const orderedObjs = orderAggregatedByIds(objects, uniqueIds);
    const views = this.objectViewService.resolve(orderedObjs, voterReputations, {
      update_types: [...SHOP_CARD_UPDATE_TYPES],
      locale,
      include_rejected: false,
    });
    const projectedList = await this.objectProjection.batchProject(views, {
      locale,
      includeSeo: false,
      governanceObjectIdFromHeader,
      viewerAccount,
    });
    const projectedById = new Map(projectedList.map((p) => [p.object_id, p]));

    const sections: ShopSectionEntry[] = pageItems.map((row) => {
      const ids = idsByCategory.get(row.name) ?? [];
      const items = ids.map((id) => projectedById.get(id)).filter((p): p is ProjectedObject => p != null);
      return {
        categoryName: row.name,
        items,
        totalObjects: row.objects_count,
      };
    });

    const lastSection = pageItems[pageItems.length - 1];
    const nextCursor = hasMore && lastSection ? lastSection.name : null;

    return { sections, cursor: nextCursor, hasMore };
  }
}
