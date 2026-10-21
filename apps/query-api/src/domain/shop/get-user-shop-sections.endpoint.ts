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
import { AffiliateLinksEnricher, flattenAffiliateTargets } from '../affiliate';
import { buildUserCategoriesResponse } from '../categories/build-user-categories-response';
import type { UserCategoriesQuery } from '../categories/categories-query.schema';
import { parseTagFilters } from '../discover/get-discover-objects.endpoint';
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

type NavItem = { name: string; objects_count: number; has_children: boolean };

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
    private readonly affiliateLinks: AffiliateLinksEnricher,
  ) {}

  async execute(
    username: string,
    query: ShopSectionsQuery,
    locale: string,
    governanceObjectIdFromHeader: string | undefined,
    viewerAccount: string | undefined,
    countryCode: string | null = null,
  ): Promise<ShopSectionsResponse | null> {
    const name = username.trim();
    if (name.length === 0) {
      return null;
    }

    const activeTags = parseTagFilters(query.tags ?? []);
    const hasFilters = activeTags.length > 0 || query.rating != null;

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
      if (idx < 0) {
        return { sections: [], cursor: null, hasMore: false };
      }
      start = idx + 1;
    }

    const nameSeg = query.name?.trim() ?? '';
    const parentPathForSamples = nameSeg.length > 0 ? [...(query.path ?? []), nameSeg] : [];

    const scopeParams = {
      username: name,
      types: query.types,
      parentPath: parentPathForSamples,
      hideLinkedObjects: hideLinked,
      shopDeselectObjectIds: deselectIds,
      tags: activeTags,
      rating: query.rating ?? null,
    };

    let pageItems: NavItem[];
    let filteredCounts: Map<string, number> | null = null;
    let hasMore: boolean;

    if (hasFilters) {
      const candidates = ordered.slice(start);
      if (candidates.length === 0) {
        return { sections: [], cursor: null, hasMore: false };
      }

      const counts = await this.objectCategoriesRepo.countObjectIdsByScopeForCategories({
        ...scopeParams,
        categoryNames: candidates.map((c) => c.name),
      });
      filteredCounts = counts;

      const matching = candidates.filter((c) => (counts.get(c.name) ?? 0) > 0);
      pageItems = matching.slice(0, query.sectionLimit);
      hasMore = matching.length > query.sectionLimit;
    } else {
      pageItems = ordered.slice(start, start + query.sectionLimit);
      hasMore = start + pageItems.length < ordered.length;
    }

    if (pageItems.length === 0) {
      return { sections: [], cursor: null, hasMore: false };
    }

    const categoryNames = pageItems.map((p) => p.name);
    const idsByCategory = await this.objectCategoriesRepo.findObjectIdsByScopeForCategories({
      ...scopeParams,
      categoryNames,
      objectsPerCategory: SHOP_SECTION_OBJECTS_PER_CATEGORY,
    });

    const allIdsOrdered: string[] = [];
    for (const cn of categoryNames) {
      for (const id of idsByCategory.get(cn) ?? []) {
        allIdsOrdered.push(id);
      }
    }
    const uniqueIds = [...new Set(allIdsOrdered)];

    const { objects, voterWaivPowers, rankVoteProjection } =
      await this.aggregatedObjectRepo.loadByObjectIds(uniqueIds, {
        viewerAccount,
      });
    const orderedObjs = orderAggregatedByIds(objects, uniqueIds);
    const views = this.objectViewService.resolve(orderedObjs, voterWaivPowers, {
      update_types: [...SHOP_CARD_UPDATE_TYPES],
      locale,
      include_rejected: false,
    });
    const projectedList = await this.objectProjection.batchProject(views, {
      locale,
      includeSeo: false,
      governanceObjectIdFromHeader,
      viewerAccount,
      rankVoteProjection,
    });
    const projectedById = new Map(projectedList.map((p) => [p.object_id, p]));

    const sections: ShopSectionEntry[] = pageItems
      .map((row) => {
        const ids = idsByCategory.get(row.name) ?? [];
        const items = ids
          .map((id) => projectedById.get(id))
          .filter((p): p is ProjectedObject => p != null);
        const totalObjects = hasFilters
          ? (filteredCounts?.get(row.name) ?? 0)
          : row.objects_count;
        return {
          categoryName: row.name,
          items,
          totalObjects,
        };
      })
      .filter((section) => !hasFilters || section.totalObjects > 0);

    const lastSection = pageItems[pageItems.length - 1];
    const nextCursor = hasMore && lastSection ? lastSection.name : null;

    await this.affiliateLinks.enrich(
      flattenAffiliateTargets(sections.flatMap((section) => section.items)),
      {
        countryCode,
        personalAccount: name,
        governanceObjectIdFromHeader,
      },
    );

    return { sections, cursor: nextCursor, hasMore };
  }
}
