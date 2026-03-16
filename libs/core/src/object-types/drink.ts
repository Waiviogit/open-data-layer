import { UPDATE_TYPES } from '../update-registry/update-types';
import { OBJECT_TYPES } from './object-types';
import { ObjectTypeDefinition } from './types';

export const DRINK_OBJECT_TYPE: ObjectTypeDefinition = {
  object_type: OBJECT_TYPES.DRINK,
  supported_updates: [
    UPDATE_TYPES.STATUS,
    UPDATE_TYPES.AVATAR,
    UPDATE_TYPES.NAME,
    UPDATE_TYPES.TITLE,
    UPDATE_TYPES.BACKGROUND,
    UPDATE_TYPES.PARENT,
    UPDATE_TYPES.TAG_CATEGORY,
    UPDATE_TYPES.CATEGORY_ITEM,
    UPDATE_TYPES.GALLERY_ALBUM,
    UPDATE_TYPES.GALLERY_ITEM,
    UPDATE_TYPES.RATING,
    UPDATE_TYPES.PRICE,
    UPDATE_TYPES.DESCRIPTION,
    UPDATE_TYPES.PIN,
    UPDATE_TYPES.REMOVE,
    UPDATE_TYPES.DELEGATION,
    UPDATE_TYPES.PROMOTION,
  ],
  supposed_updates: [
    {
      update_type: UPDATE_TYPES.RATING,
      values: ["Presentation","Taste","Value"],
    },
    {
      update_type: UPDATE_TYPES.TAG_CATEGORY,
      values: ["Category","Ingredients"],
    },
  ],
};
