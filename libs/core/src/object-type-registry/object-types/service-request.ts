import { UPDATE_TYPES } from '../../update-registry/update-types';
import { OBJECT_TYPES } from '../object-types';
import { ObjectTypeDefinition } from '../types';

export const SERVICE_REQUEST_OBJECT_TYPE: ObjectTypeDefinition = {
  object_type: OBJECT_TYPES.SERVICE_REQUEST,
  description: 'Agent-oriented service request for OBL catalog discovery.',
  supported_updates: [
    UPDATE_TYPES.STATUS,
    UPDATE_TYPES.NAME,
    UPDATE_TYPES.TITLE,
    UPDATE_TYPES.DESCRIPTION,
    UPDATE_TYPES.IMAGE,
    UPDATE_TYPES.IMAGE_BACKGROUND,
    UPDATE_TYPES.TAG_CATEGORY,
    UPDATE_TYPES.TAG_CATEGORY_ITEM,
    UPDATE_TYPES.CATEGORY,
    UPDATE_TYPES.URL,
    UPDATE_TYPES.PARENT,
    UPDATE_TYPES.PIN,
    UPDATE_TYPES.REMOVE,
    UPDATE_TYPES.IS_RELATED_TO,
    UPDATE_TYPES.DELEGATION,
    UPDATE_TYPES.CAPABILITY,
    UPDATE_TYPES.PRICE_MODEL,
    UPDATE_TYPES.CURRENCY,
    UPDATE_TYPES.SLA,
    UPDATE_TYPES.BUDGET,
    UPDATE_TYPES.PROVIDER,
    UPDATE_TYPES.INPUT,
    UPDATE_TYPES.OUTPUT,
    UPDATE_TYPES.LIMITATIONS,
  ],
  supposed_updates: [
    {
      update_type: UPDATE_TYPES.TAG_CATEGORY,
      values: ['Category'],
    },
  ],
};
