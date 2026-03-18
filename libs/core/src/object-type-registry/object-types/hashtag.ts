import { UPDATE_TYPES } from '../../update-registry/update-types';
import { OBJECT_TYPES } from '../object-types';
import { ObjectTypeDefinition } from '../types';

export const HASHTAG_OBJECT_TYPE: ObjectTypeDefinition = {
  object_type: OBJECT_TYPES.HASHTAG,
  description: 'Hashtag or topic tag for categorization.',
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
    UPDATE_TYPES.PROMOTION
    ],
  supposed_updates: [],
};