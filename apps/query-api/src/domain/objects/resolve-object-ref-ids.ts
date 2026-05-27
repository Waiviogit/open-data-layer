import { UPDATE_TYPES } from '@opden-data-layer/core';
import type { ObjectRefListRepository } from '../../repositories/object-ref-list.repository';
import type { ObjectRefListUpdateType } from './get-object-ref-list.endpoint';

export async function resolveObjectRefIds(params: {
  sourceId: string;
  updateType: ObjectRefListUpdateType;
  explicitRefIds: readonly string[];
  skip: number;
  limit: number;
  repo: ObjectRefListRepository;
}): Promise<{ pageIds: string[]; hasMore: boolean; nextCursor: string | null }> {
  const explicitIds = [...new Set(params.explicitRefIds.map((id) => id.trim()).filter(Boolean))];
  const take = params.limit + 1;
  const excludeMetaGroupIds = await params.repo.findMetaGroupIdsByObjectIds(explicitIds);

  let pageIds: string[] = [];
  if (params.skip < explicitIds.length) {
    pageIds = explicitIds.slice(params.skip, params.skip + take);
  }

  const categorySkip = Math.max(0, params.skip - explicitIds.length);
  const remaining = take - pageIds.length;

  if (remaining > 0) {
    let backfillIds: string[] = [];

    if (
      params.updateType === UPDATE_TYPES.IS_RELATED_TO ||
      params.updateType === UPDATE_TYPES.IS_SIMILAR_TO
    ) {
      const categoryNames = await params.repo.findCategoryNamesByObjectId(params.sourceId);
      if (categoryNames.length > 0) {
        if (params.updateType === UPDATE_TYPES.IS_RELATED_TO) {
          backfillIds = await params.repo.findRelatedBackfillObjectIds({
            sourceId: params.sourceId,
            categoryNames,
            excludeObjectIds: explicitIds,
            excludeMetaGroupIds,
            skip: categorySkip,
            limit: remaining,
          });
        } else {
          backfillIds = await params.repo.findSimilarBackfillObjectIds({
            sourceId: params.sourceId,
            categoryNames,
            excludeObjectIds: explicitIds,
            excludeMetaGroupIds,
            skip: categorySkip,
            limit: remaining,
          });
        }
      }
    } else if (params.updateType === UPDATE_TYPES.ADD_ON) {
      backfillIds = await params.repo.findReverseAddOnObjectIds({
        sourceId: params.sourceId,
        excludeObjectIds: explicitIds,
        skip: categorySkip,
        limit: remaining,
      });
    }

    pageIds = [...pageIds, ...backfillIds.slice(0, remaining)];
  }

  const trimmed = pageIds.slice(0, params.limit);
  const hasMore = pageIds.length > params.limit;
  const nextCursor = hasMore ? String(params.skip + trimmed.length) : null;

  return { pageIds: trimmed, hasMore, nextCursor };
}
