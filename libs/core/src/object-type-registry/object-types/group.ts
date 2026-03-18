import { UPDATE_TYPES } from '../../update-registry/update-types';
import { OBJECT_TYPES } from '../object-types';
import { ObjectTypeDefinition } from '../types';

export const GROUP_OBJECT_TYPE: ObjectTypeDefinition = {
  object_type: OBJECT_TYPES.GROUP,
  description: 'Group or community with membership and expertise.',
  supported_updates: [
    UPDATE_TYPES.STATUS,
    UPDATE_TYPES.AVATAR,
    UPDATE_TYPES.PIN,
    UPDATE_TYPES.REMOVE,
    UPDATE_TYPES.NAME,
    UPDATE_TYPES.TITLE,
    UPDATE_TYPES.DESCRIPTION,
    UPDATE_TYPES.BACKGROUND,
    UPDATE_TYPES.DELEGATION,
    UPDATE_TYPES.TAG_CATEGORY,
    UPDATE_TYPES.CATEGORY_ITEM,
    UPDATE_TYPES.GALLERY_ALBUM,
    UPDATE_TYPES.GALLERY_ITEM,
    UPDATE_TYPES.WEBSITE,
    UPDATE_TYPES.GROUP_EXPERTISE,
    UPDATE_TYPES.GROUP_FOLLOWERS,
    UPDATE_TYPES.GROUP_FOLLOWING,
    UPDATE_TYPES.GROUP_ADD,
    UPDATE_TYPES.GROUP_EXCLUDE,
    UPDATE_TYPES.GROUP_LAST_ACTIVITY,
    UPDATE_TYPES.PROMOTION,
  ],
  supposed_updates: [
  ],
};
