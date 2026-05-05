import { Injectable } from '@nestjs/common';
import type { AggregatedObject } from '@opden-data-layer/objects-domain';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import {
  AccountsCurrentRepository,
  AggregatedObjectRepository,
  UserObjectFollowsRepository,
} from '../../repositories';
import {
  ObjectProjectionService,
  type ProjectedObject,
} from '../object-projection';
import { FOLLOWING_OBJECTS_CARD_UPDATE_TYPES } from './social.constants';
import type { UserFollowingObjectsQuery } from './user-social-list.schema';
import type { PaginatedProjectedObjects } from './paginated-objects.types';

function orderAggregatedByIds(objects: AggregatedObject[], objectIds: string[]): AggregatedObject[] {
  const map = new Map(objects.map((o) => [o.core.object_id, o]));
  return objectIds.map((id) => map.get(id)).filter((o): o is AggregatedObject => o != null);
}

@Injectable()
export class GetUserFollowingObjectsEndpoint {
  constructor(
    private readonly accounts: AccountsCurrentRepository,
    private readonly objectFollows: UserObjectFollowsRepository,
    private readonly aggregatedObjectRepo: AggregatedObjectRepository,
    private readonly objectViewService: ObjectViewService,
    private readonly objectProjection: ObjectProjectionService,
  ) {}

  async execute(
    username: string,
    query: UserFollowingObjectsQuery,
    locale: string,
    governanceObjectIdFromHeader: string | undefined,
    viewerAccount: string | undefined,
  ): Promise<PaginatedProjectedObjects | null> {
    const name = username.trim();
    if (name.length === 0) {
      return null;
    }

    const row = await this.accounts.findByName(name);
    if (!row) {
      return null;
    }

    const sortMode = query.sort === 'recency' ? 'recency' : 'weight';

    const [total, followRows] = await Promise.all([
      this.objectFollows.countByAccount(name),
      this.objectFollows.findObjectsByAccount(name, sortMode, query.skip, query.limit),
    ]);

    const objectIds = followRows.map((r) => r.object_id);
    const weightById = new Map(followRows.map((r) => [r.object_id, r.weight]));

    if (objectIds.length === 0) {
      return { items: [], total, hasMore: false };
    }

    const { objects, voterWaivPowers } = await this.aggregatedObjectRepo.loadByObjectIds(objectIds);
    const ordered = orderAggregatedByIds(objects, objectIds);

    const views = this.objectViewService.resolve(ordered, voterWaivPowers, {
      update_types: [...FOLLOWING_OBJECTS_CARD_UPDATE_TYPES],
      locale,
      include_rejected: false,
    });

    let projectedList = await this.objectProjection.batchProject(views, {
      locale,
      includeSeo: false,
      governanceObjectIdFromHeader,
      viewerAccount,
    });

    projectedList = projectedList.map((p) => ({
      ...p,
      weight: weightById.get(p.object_id) ?? p.weight,
    }));

    const items: ProjectedObject[] = projectedList;

    return {
      items,
      total,
      hasMore: query.skip + items.length < total,
    };
  }
}
