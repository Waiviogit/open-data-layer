import type { JsonValue } from '@opden-data-layer/core';
import { UPDATE_TYPES } from '@opden-data-layer/core';
import type { PostObject } from '@opden-data-layer/core';
import type { ResolvedObjectView } from '@opden-data-layer/objects-domain';

import type { FeedObjectSummaryDto } from './feed-story-dtos';
import {
  LINKED_OBJECT_CATEGORY_ITEMS_MAX,
  LINKED_OBJECT_DESCRIPTION_MAX,
} from './feed.constants';
import { stripHtmlForExcerpt, truncateExcerpt } from './post-excerpt';

export interface TaggedObjectRowWithWeight {
  objectId: string;
  objectType: string | null;
  name: string | null;
  avatarUrl: string | null;
  weight: number | null;
}

/** Tagged row plus fields for full-post linked-object cards. */
export interface LinkedObjectDetailRow extends TaggedObjectRowWithWeight {
  description: string | null;
  rating: string | null;
  categoryItems: string[];
}

export function pickSingleText(view: ResolvedObjectView, updateType: string): string | null {
  const field = view.fields[updateType];
  if (!field || field.cardinality !== 'single') {
    return null;
  }
  const v = field.values[0];
  return v?.value_text ?? null;
}

function parseCategoryItemLabel(valueJson: JsonValue | null): string | null {
  if (valueJson == null || typeof valueJson !== 'object' || Array.isArray(valueJson)) {
    return null;
  }
  const v = (valueJson as Record<string, unknown>).value;
  return typeof v === 'string' && v.length > 0 ? v : null;
}

/**
 * Up to `max` category_item `value` labels, most recent by `event_seq` first in selection,
 * then ordered ascending by `event_seq` for subtitle display (oldest В· newest).
 */
export function pickLastCategoryItemLabels(view: ResolvedObjectView, max: number): string[] {
  const field = view.fields[UPDATE_TYPES.TAG_CATEGORY_ITEM];
  if (!field || field.cardinality !== 'multi' || field.values.length === 0) {
    return [];
  }
  const withLabels = field.values
    .map((u) => ({ u, label: parseCategoryItemLabel(u.value_json) }))
    .filter((x): x is { u: (typeof field.values)[0]; label: string } => x.label != null);
  if (withLabels.length === 0) {
    return [];
  }
  const bySeqDesc = [...withLabels].sort((a, b) =>
    a.u.event_seq > b.u.event_seq ? -1 : a.u.event_seq < b.u.event_seq ? 1 : 0,
  );
  const top = bySeqDesc.slice(0, max);
  top.sort((a, b) => (a.u.event_seq < b.u.event_seq ? -1 : 1));
  return top.map((x) => x.label);
}

/** First value after ranking (multi rating) вЂ” primary display string for stars. */
export function pickPrimaryRating(view: ResolvedObjectView): string | null {
  const field = view.fields[UPDATE_TYPES.AGGREGATE_RATING];
  if (!field || field.values.length === 0) {
    return null;
  }
  return field.values[0]?.value_text ?? null;
}

export function pickDescriptionExcerpt(view: ResolvedObjectView, maxLen: number): string | null {
  const text = pickSingleText(view, UPDATE_TYPES.DESCRIPTION);
  if (text == null || text === '') {
    return null;
  }
  const plain = stripHtmlForExcerpt(text);
  return truncateExcerpt(plain, maxLen);
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
    const avatarUrl = view ? pickSingleText(view, UPDATE_TYPES.IMAGE) : null;
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
 * Full linked-object fields for single-post resolution (wider update_types).
 */
export function mapPostObjectsToLinkedDetailRows(
  objectsForPost: PostObject[],
  viewsByObjectId: Map<string, ResolvedObjectView>,
  weightByObjectId: Map<string, number | null>,
): LinkedObjectDetailRow[] {
  return objectsForPost.map((o) => {
    const view = viewsByObjectId.get(o.object_id);
    const avatarUrl = view ? pickSingleText(view, UPDATE_TYPES.IMAGE) : null;
    return {
      objectId: o.object_id,
      objectType: o.object_type,
      name: view ? pickSingleText(view, UPDATE_TYPES.NAME) : null,
      avatarUrl,
      weight: weightByObjectId.get(o.object_id) ?? null,
      description: view ? pickDescriptionExcerpt(view, LINKED_OBJECT_DESCRIPTION_MAX) : null,
      rating: view ? pickPrimaryRating(view) : null,
      categoryItems: view ? pickLastCategoryItemLabels(view, LINKED_OBJECT_CATEGORY_ITEMS_MAX) : [],
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
    description: null,
    rating: null,
    categoryItems: [],
    hasAdministrativeAuthority: false,
  }));
}

/**
 * Same ordering as feed chips; fills linked-object card fields and administrative heart flag.
 */
export function sortLinkedObjectSummaries(
  items: LinkedObjectDetailRow[],
  administrativeObjectIds: Set<string>,
): FeedObjectSummaryDto[] {
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
  return sorted.map(
    ({
      objectId,
      objectType,
      name,
      avatarUrl,
      description,
      rating,
      categoryItems,
    }) => ({
      objectId,
      objectType,
      name,
      avatarUrl,
      description,
      rating,
      categoryItems,
      hasAdministrativeAuthority: administrativeObjectIds.has(objectId),
    }),
  );
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
