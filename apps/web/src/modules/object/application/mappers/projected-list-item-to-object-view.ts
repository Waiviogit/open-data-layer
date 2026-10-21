import type { ProjectedObjectView } from '@/modules/feed/application/dto/object-fields';

import type { ProjectedListItem, ProjectedListItemRef } from '../../domain/projected-list-item.types';

function listItemRefToFieldPayload(ref: ProjectedListItemRef): Record<string, unknown> {
  const nested: Record<string, unknown> = { name: ref.name };
  if (ref.imageUrl) {
    nested.image = ref.imageUrl;
  }
  return {
    object_id: ref.objectId,
    object_type: ref.objectType,
    fields: nested,
  };
}

/** Maps catalog list rows to `ProjectedObjectView` for `ObjectCard`. */
export function projectedListItemToObjectView(item: ProjectedListItem): ProjectedObjectView {
  const tagCategoryLabels = (item.tagCategoryLabels ?? []).filter(Boolean);
  const aggregateRating = (item.aggregateRatingAspects ?? []).map((aspect) => ({
    update_id: aspect.update_id,
    dimension: aspect.dimension,
    averageRating: aspect.averageRating,
    userRating: aspect.userRating,
    totalVoters: aspect.totalVoters,
  }));

  const fields: Record<string, unknown> = {
    name: item.name,
  };

  if (item.imageUrl) {
    fields.image = item.imageUrl;
  }
  if (item.description) {
    fields.description = item.description;
  }
  if (item.title) {
    fields.title = item.title;
  }
  if (item.address != null) {
    fields.address = item.address;
  }
  if (item.geo != null) {
    fields.geo = item.geo;
  }
  if (item.price) {
    fields.price = item.price;
  }
  if (item.brandRef) {
    fields.brand = listItemRefToFieldPayload(item.brandRef);
  }
  if (item.parentRef) {
    fields.parent = listItemRefToFieldPayload(item.parentRef);
  }
  if (tagCategoryLabels.length > 0) {
    fields.tagCategoryItem = tagCategoryLabels.map((value) => ({ value }));
  }
  if (aggregateRating.length > 0) {
    fields.aggregateRating = aggregateRating;
  }

  return {
    object_id: item.objectId,
    object_type: item.objectType,
    semantic_type: null,
    weight: item.weight ?? 0,
    fields,
    isFavorited: item.isFavorited ?? false,
    hasSupervisedOwnership: false,
    hasExclusiveOwnership: false,
    ...(item.affiliateLinks && item.affiliateLinks.length > 0
      ? { affiliateLinks: item.affiliateLinks }
      : {}),
  };
}
