import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import {
  initialGalleryFormValue,
  initialGalleryItemFormValue,
} from './gallery-form-value';
import { initialFormValueForUpdateType } from './menu-item-form-value';

/** Form defaults for `tagCategoryItem` when categories already exist on the object. */
export function initialTagCategoryItemFormValue(
  categories: readonly string[],
): Record<string, unknown> {
  return {
    category: categories[0] ?? '',
    value: '',
  };
}

export function initialFormValueForUpdateTypeWithContext(
  updateType: string,
  tagCategoryNames: readonly string[],
  presetGalleryAlbumName?: string,
): unknown {
  if (
    updateType === UPDATE_TYPES.TAG_CATEGORY_ITEM &&
    tagCategoryNames.length > 0
  ) {
    return initialTagCategoryItemFormValue(tagCategoryNames);
  }
  if (updateType === UPDATE_TYPES.IMAGE_GALLERY) {
    return initialGalleryFormValue();
  }
  if (updateType === UPDATE_TYPES.IMAGE_GALLERY_ITEM) {
    return initialGalleryItemFormValue(presetGalleryAlbumName);
  }
  return initialFormValueForUpdateType(updateType);
}

export function defaultUpdateTypeForCandidates(
  candidateUpdateTypes: readonly string[],
  tagCategoryNames: readonly string[],
): string {
  if (
    tagCategoryNames.length > 0 &&
    candidateUpdateTypes.includes(UPDATE_TYPES.TAG_CATEGORY_ITEM)
  ) {
    return UPDATE_TYPES.TAG_CATEGORY_ITEM;
  }
  return candidateUpdateTypes[0] ?? '';
}
