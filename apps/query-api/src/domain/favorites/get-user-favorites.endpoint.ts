import { Injectable } from '@nestjs/common';
import type { AggregatedObject } from '@opden-data-layer/objects-domain';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import {
  AggregatedObjectRepository,
  UserFavoritesRepository,
  UserMetadataRepository,
  UserShopDeselectRepository,
} from '../../repositories';
import { AffiliateLinksEnricher, flattenAffiliateTargets } from '../affiliate';
import { ObjectProjectionService } from '../object-projection';
import type { ProjectedObject } from '../object-projection/projected-object.types';
import type { PaginatedProjectedObjects } from '../social/paginated-objects.types';
import { FAVORITES_CARD_UPDATE_TYPES } from './favorites.constants';
import type { UserFavoritesQuery } from './favorites.schema';

function orderAggregatedByIds(objects: AggregatedObject[], objectIds: string[]): AggregatedObject[] {
  const map = new Map(objects.map((o) => [o.core.object_id, o]));
  return objectIds.map((id) => map.get(id)).filter((o): o is AggregatedObject => o != null);
}

@Injectable()
export class GetUserFavoritesEndpoint {
  constructor(
    private readonly userMetadataRepo: UserMetadataRepository,
    private readonly shopDeselectRepo: UserShopDeselectRepository,
    private readonly favoritesRepo: UserFavoritesRepository,
    private readonly aggregatedObjectRepo: AggregatedObjectRepository,
    private readonly objectViewService: ObjectViewService,
    private readonly objectProjection: ObjectProjectionService,
    private readonly affiliateLinks: AffiliateLinksEnricher,
  ) {}

  async execute(
    username: string,
    query: UserFavoritesQuery,
    locale: string,
    governanceObjectIdFromHeader: string | undefined,
    viewerAccount: string | undefined,
    countryCode: string | null = null,
  ): Promise<PaginatedProjectedObjects | null> {
    const name = username.trim();
    if (name.length === 0) {
      return null;
    }

    const [flags, deselectIds] = await Promise.all([
      this.userMetadataRepo.findShopVisibilityFlags(name),
      this.shopDeselectRepo.findObjectIdsByAccount(name),
    ]);

    const scope = {
      account: name,
      hideFavoriteObjects: flags.hide_favorite_objects,
      shopDeselectObjectIds: deselectIds,
    };

    const objectTypeRaw = query.objectType?.trim();
    const objectType = objectTypeRaw && objectTypeRaw.length > 0 ? objectTypeRaw : undefined;

    const [total, objectIds] = await Promise.all([
      this.favoritesRepo.countByScope(scope, objectType),
      this.favoritesRepo.findObjectIdsByScope(scope, objectType, query.skip, query.limit),
    ]);

    if (objectType && total === 0) {
      return { items: [], total: 0, hasMore: false };
    }

    if (objectIds.length === 0) {
      return { items: [], total, hasMore: false };
    }

    const { objects, voterWaivPowers, rankVoteProjection } =
      await this.aggregatedObjectRepo.loadByObjectIds(objectIds, {
        viewerAccount,
      });
    const ordered = orderAggregatedByIds(objects, objectIds);

    const views = this.objectViewService.resolve(ordered, voterWaivPowers, {
      update_types: [...FAVORITES_CARD_UPDATE_TYPES],
      locale,
      include_rejected: false,
    });

    const items: ProjectedObject[] = await this.objectProjection.batchProject(views, {
      locale,
      includeSeo: false,
      governanceObjectIdFromHeader,
      viewerAccount,
      rankVoteProjection,
    });

    await this.affiliateLinks.enrich(flattenAffiliateTargets(items), {
      countryCode,
      personalAccount: name,
      governanceObjectIdFromHeader,
    });

    return {
      items,
      total,
      hasMore: query.skip + items.length < total,
    };
  }
}
