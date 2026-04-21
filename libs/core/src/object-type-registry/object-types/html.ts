import { UPDATE_TYPES } from '../../update-registry/update-types';
import { OBJECT_TYPES } from '../object-types';
import { ObjectTypeDefinition } from '../types';

export const HTML_OBJECT_TYPE: ObjectTypeDefinition = {
  object_type: OBJECT_TYPES.HTML,
  description: 'Standalone HTML content block.',
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
    UPDATE_TYPES.PROMOTION,
    UPDATE_TYPES.PARENT,
    UPDATE_TYPES.TAG_CATEGORY,
    UPDATE_TYPES.TAG_CATEGORY_ITEM,
    UPDATE_TYPES.IMAGE_GALLERY,
    UPDATE_TYPES.IMAGE_GALLERY_ITEM,
    UPDATE_TYPES.WEBSITE,
    UPDATE_TYPES.HTML_CONTENT,
    UPDATE_TYPES.CONTENT_POSITION,
    UPDATE_TYPES.CONTENT_VIEW,
  ],
  supposed_updates: [
  ],
};
