import { UPDATE_TYPES } from '../../update-registry/update-types';
import { OBJECT_TYPES } from '../object-types';
import { ObjectTypeDefinition } from '../types';

export const LINK_OBJECT_TYPE: ObjectTypeDefinition = {
  object_type: OBJECT_TYPES.LINK,
  description: 'Link or URL reference.',
  supported_updates: [
    UPDATE_TYPES.STATUS,
    UPDATE_TYPES.IMAGE,
    UPDATE_TYPES.PIN,
    UPDATE_TYPES.REMOVE,
    UPDATE_TYPES.NAME,
    UPDATE_TYPES.TITLE,
    UPDATE_TYPES.DESCRIPTION,
    UPDATE_TYPES.IMAGE_BACKGROUND,
    UPDATE_TYPES.DELEGATION,
    UPDATE_TYPES.IMAGE_GALLERY,
    UPDATE_TYPES.IMAGE_GALLERY_ITEM,
    UPDATE_TYPES.TAG_CATEGORY,
    UPDATE_TYPES.TAG_CATEGORY_ITEM,
    UPDATE_TYPES.PARENT,
    UPDATE_TYPES.AGGREGATE_RATING,
    UPDATE_TYPES.URL,
    UPDATE_TYPES.PROMOTION,
  ],
  supposed_updates: [
    {
      update_type: UPDATE_TYPES.AGGREGATE_RATING,
      values: ["Safety","Value"],
    },
    {
      update_type: UPDATE_TYPES.TAG_CATEGORY,
      values: ["Pros","Cons"],
    },
  ],
};
