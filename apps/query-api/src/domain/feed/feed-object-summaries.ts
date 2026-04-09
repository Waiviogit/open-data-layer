import { UPDATE_TYPES } from '@opden-data-layer/core';
import type { PostObject } from '@opden-data-layer/core';
import type { ResolvedObjectView } from '@opden-data-layer/objects-domain';

import type { FeedObjectSummaryDto } from './feed-story-dtos';

export interface TaggedObjectRowWithWeight {
  objectId: string;
  objectType: string | null;
  name: string | null;
  avatarUrl: string | null;
  weight: number | null;
}

export function pickSingleText(view: ResolvedObjectView, updateType: string): string | null {
  const field = view.fields[updateType];
  if (!field || field.cardinality !== 'single') {
    return null;
  }
  const v = field.values[0];
  return v?.value_text ?? null;
}

/**
 * Maps `post_objects` rows to name/avatar using resolved views and core weight for ordering.
 */
export function mapPostObjectsToTaggedRowsWithWeight(
  objectsForPost: PostObject[],
  viewsByObjectId: Map<string, ResolvedObjectView>,
  weightByObjectId: Map<string, number | null>,
): TaggedObjectRowWithWeight[] {
  return objectsForPost.map((o) => {
    const view = viewsByObjectId.get(o.object_id);
    const avatarUrl = view ? pickSingleText(view, UPDATE_TYPES.AVATAR) : null;
    return {
      objectId: o.object_id,
      objectType: o.object_type,
      name: view ? pickSingleText(view, UPDATE_TYPES.NAME) : null,
      avatarUrl,
      weight: weightByObjectId.get(o.object_id) ?? null,
    };
  });
}

/**
 * Tagged objects for display: prefer avatar resolved, then higher `objects_core.weight`, then id.
 */
export function sortFeedObjectSummaries(items: TaggedObjectRowWithWeight[]): FeedObjectSummaryDto[] {
  const sorted = [...items].sort((a, b) => {
    const ha = a.avatarUrl ? 1 : 0;
    const hb = b.avatarUrl ? 1 : 0;
    if (ha !== hb) {
      return hb - ha;
    }
    const wa = a.weight ?? Number.NEGATIVE_INFINITY;
    const wb = b.weight ?? Number.NEGATIVE_INFINITY;
    if (wa !== wb) {
      return wb - wa;
    }
    return a.objectId.localeCompare(b.objectId);
  });
  return sorted.map(({ objectId, objectType, name, avatarUrl }) => ({
    objectId,
    objectType,
    name,
    avatarUrl,
  }));
}

/**
 * Feed cards: same order as {@link sortFeedObjectSummaries}, first `limit` chips only.
 */
export function sortAndLimitFeedObjectSummaries(
  items: TaggedObjectRowWithWeight[],
  limit: number,
): FeedObjectSummaryDto[] {
  return sortFeedObjectSummaries(items).slice(0, limit);
}
