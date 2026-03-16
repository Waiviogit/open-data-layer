import { UPDATE_TYPES } from '../update-registry/update-types';
import { OBJECT_TYPES } from './object-types';
import { ObjectTypeDefinition } from './types';

export const CRYPTOPAIRS_OBJECT_TYPE: ObjectTypeDefinition = {
  object_type: OBJECT_TYPES.CRYPTOPAIRS,
  supported_updates: [
    UPDATE_TYPES.CHART_ID,
    UPDATE_TYPES.NAME,
    UPDATE_TYPES.PIN,
    UPDATE_TYPES.REMOVE,
    UPDATE_TYPES.STATUS,
    UPDATE_TYPES.AVATAR,
    UPDATE_TYPES.TITLE,
    UPDATE_TYPES.DESCRIPTION,
    UPDATE_TYPES.BACKGROUND,
    UPDATE_TYPES.DELEGATION,
    UPDATE_TYPES.PROMOTION,
  ],
  supposed_updates: [
  ],
};
