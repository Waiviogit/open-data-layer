import { UPDATE_TYPES } from '../../update-registry/update-types';
import { OBJECT_TYPES } from '../object-types';
import { ObjectTypeDefinition } from '../types';

export const SHOP_OBJECT_TYPE: ObjectTypeDefinition = {
  object_type: OBJECT_TYPES.SHOP,
  supported_updates: [
    UPDATE_TYPES.SHOP_FILTER,
    UPDATE_TYPES.PARENT,
    UPDATE_TYPES.NAME,
    UPDATE_TYPES.GALLERY_ALBUM,
    UPDATE_TYPES.GALLERY_ITEM,
    UPDATE_TYPES.AVATAR,
    UPDATE_TYPES.TITLE,
    UPDATE_TYPES.DESCRIPTION,
    UPDATE_TYPES.BACKGROUND,
    UPDATE_TYPES.STATUS,
    UPDATE_TYPES.PIN,
    UPDATE_TYPES.REMOVE,
    UPDATE_TYPES.WEBSITE,
    UPDATE_TYPES.DELEGATION,
    UPDATE_TYPES.PROMOTION,
  ],
  supposed_updates: [
  ],
};
