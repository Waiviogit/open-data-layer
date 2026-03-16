import { UPDATE_TYPES } from '../update-registry/update-types';
import { OBJECT_TYPES } from './object-types';
import { ObjectTypeDefinition } from './types';

export const AFFILIATE_OBJECT_TYPE: ObjectTypeDefinition = {
  object_type: OBJECT_TYPES.AFFILIATE,
  supported_updates: [
    UPDATE_TYPES.AFFILIATE_BUTTON,
    UPDATE_TYPES.AFFILIATE_PRODUCT_ID_TYPES,
    UPDATE_TYPES.AFFILIATE_GEO_AREA,
    UPDATE_TYPES.AFFILIATE_URL_TEMPLATE,
    UPDATE_TYPES.AFFILIATE_CODE,
    UPDATE_TYPES.PARENT,
    UPDATE_TYPES.NAME,
    UPDATE_TYPES.DESCRIPTION,
    UPDATE_TYPES.RATING,
    UPDATE_TYPES.TAG_CATEGORY,
    UPDATE_TYPES.CATEGORY_ITEM,
    UPDATE_TYPES.GALLERY_ALBUM,
    UPDATE_TYPES.GALLERY_ITEM,
    UPDATE_TYPES.PIN,
    UPDATE_TYPES.REMOVE,
    UPDATE_TYPES.AVATAR,
    UPDATE_TYPES.TITLE,
    UPDATE_TYPES.BACKGROUND,
    UPDATE_TYPES.STATUS,
    UPDATE_TYPES.DELEGATION,
    UPDATE_TYPES.PROMOTION,
  ],
  supposed_updates: [
    {
      update_type: UPDATE_TYPES.RATING,
      values: ["Commissions","Payments"],
    },
    {
      update_type: UPDATE_TYPES.TAG_CATEGORY,
      values: ["Tags"],
    },
  ],
};
