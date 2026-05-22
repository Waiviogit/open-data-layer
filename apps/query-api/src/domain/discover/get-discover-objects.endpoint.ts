import { Injectable } from '@nestjs/common';
import type { AggregatedObject } from '@opden-data-layer/objects-domain';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import { AggregatedObjectRepository, DiscoverRepository } from '../../repositories';
import { GovernanceResolverService } from '../governance';
import { ObjectProjectionService } from '../object-projection/object-projection.service';
import { SHOP_CARD_UPDATE_TYPES } from '../shop/shop.constants';
import type { DiscoverObjectsQuery } from './discover-query.schema';
import type { DiscoverObjectsResponseDto } from './discover.types';

export interface GetDiscoverObjectsInput {
  query: DiscoverObjectsQuery;
  locale: string;
  viewerAccount?: string;
  governanceObjectIdFromHeader?: string;
}

function orderAggregatedByIds(objects: AggregatedObject[], objectIds: string[]): AggregatedObject[] {
  const map = new Map(objects.map((o) => [o.core.object_id, o]));
  return objectIds.map((id) => map.get(id)).filter((x): x is AggregatedObject => x != null);
}

/** Parses `category:value` query tags; skips legacy value-only strings. */
export function parseTagFilters(
  raw: string[],
): Array<{ category: string; value: string }> {
  return raw.flatMap((s) => {
    const idx = s.indexOf(':');
    if (idx < 1) {
      return [];
    }
    const category = s.slice(0, idx);
    const value = s.slice(idx + 1);
    if (value.length === 0) {
      return [];
    }
    return [{ category, value }];
  });
}

@Injectable()
export class GetDiscoverObjectsEndpoint {
  constructor(
    private readonly discoverRepo: DiscoverRepository,
    private readonly aggregatedObjectRepo: AggregatedObjectRepository,
    private readonly objectViewService: ObjectViewService,
    private readonly governanceResolver: GovernanceResolverService,
    private readonly objectProjectionService: ObjectProjectionService,
  ) {}

  async execute(input: GetDiscoverObjectsInput): Promise<DiscoverObjectsResponseDto> {
    const q = input.query.q?.trim();
    if (q && q.length > 0 && !input.query.object_type) {
      // Text search without type is allowed but may be heavy; still proceed.
    }

    const { rows, hasMore } = await this.discoverRepo.listObjects({
      objectType: input.query.object_type,
      q: q && q.length > 0 ? q : undefined,
      tags: parseTagFilters(input.query.tags),
      sort: input.query.sort,
      cursor: input.query.cursor,
      limit: input.query.limit,
      viewerAccount: input.viewerAccount,
    });

    if (rows.length === 0) {
      return { items: [], cursor: null, hasMore: false };
    }

    const objectIds = rows.map((r) => r.object_id);
    const { objects, voterWaivPowers, rankVoteProjection } =
      await this.aggregatedObjectRepo.loadByObjectIds(objectIds, {
        viewerAccount: input.viewerAccount,
      });

    const ordered = orderAggregatedByIds(objects, objectIds);
    const governance = await this.governanceResolver.resolveMergedForObjectView(
      input.governanceObjectIdFromHeader,
    );

    const views = this.objectViewService.resolve(ordered, voterWaivPowers, {
      update_types: [...SHOP_CARD_UPDATE_TYPES],
      locale: input.locale,
      include_rejected: false,
      governance,
    });

    const projected = await this.objectProjectionService.batchProject(views, {
      locale: input.locale,
      includeSeo: false,
      governanceObjectIdFromHeader: input.governanceObjectIdFromHeader,
      viewerAccount: input.viewerAccount,
      rankVoteProjection,
    });

    const lastRow = rows[rows.length - 1];
    const cursor = hasMore
      ? this.discoverRepo.buildObjectCursor(lastRow, input.query.sort)
      : null;

    return {
      items: projected,
      cursor,
      hasMore,
    };
  }
}
