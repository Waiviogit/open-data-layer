import { UPDATE_TYPES } from '../../update-registry/update-types';
import { OBJECT_TYPES } from '../object-types';
import { ObjectTypeDefinition } from '../types';

export const LIST_OBJECT_TYPE: ObjectTypeDefinition = {
  object_type: OBJECT_TYPES.LIST,
  description: 'Curated list or collection of items.',
  supported_updates: [
    UPDATE_TYPES.STATUS,
    UPDATE_TYPES.IMAGE,
    UPDATE_TYPES.NAME,
    UPDATE_TYPES.TITLE,
    UPDATE_TYPES.BACKGROUND,
    UPDATE_TYPES.PARENT,
    UPDATE_TYPES.TAG_CATEGORY,
    UPDATE_TYPES.CATEGORY_ITEM,
    UPDATE_TYPES.GALLERY_ALBUM,
    UPDATE_TYPES.GALLERY_ITEM,
    UPDATE_TYPES.WEBSITE,
    UPDATE_TYPES.DESCRIPTION,
    UPDATE_TYPES.LIST_ITEM,
    UPDATE_TYPES.SORT_CUSTOM,
    UPDATE_TYPES.PIN,
    UPDATE_TYPES.REMOVE,
    UPDATE_TYPES.DELEGATION,
    UPDATE_TYPES.PROMOTION,
    UPDATE_TYPES.CONTENT_VIEW,
  ],
  supposed_updates: [
  ],
};
