import type { ProjectedObjectView } from '@/modules/feed/application/dto/object-fields';

import type { ProjectedListItem } from '../../domain/projected-list-item.types';

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
    hasAdministrativeAuthority: item.hasAdministrativeAuthority ?? false,
    hasOwnershipAuthority: false,
  };
}
