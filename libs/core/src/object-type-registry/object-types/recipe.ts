import { UPDATE_TYPES } from '../../update-registry/update-types';
import { OBJECT_TYPES } from '../object-types';
import { ObjectTypeDefinition } from '../types';

export const RECIPE_OBJECT_TYPE: ObjectTypeDefinition = {
  object_type: OBJECT_TYPES.RECIPE,
  description: 'Recipe or cooking instructions with ingredients.',
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
    UPDATE_TYPES.TAG_CATEGORY,
    UPDATE_TYPES.TAG_CATEGORY_ITEM,
    UPDATE_TYPES.IMAGE_GALLERY,
    UPDATE_TYPES.IMAGE_GALLERY_ITEM,
    UPDATE_TYPES.AGGREGATE_RATING,
    UPDATE_TYPES.CALORIES,
    UPDATE_TYPES.BUDGET,
    UPDATE_TYPES.COOK_TIME,
    UPDATE_TYPES.ADD_ON,
    UPDATE_TYPES.IS_SIMILAR_TO,
    UPDATE_TYPES.FEATURE_LIST,
    UPDATE_TYPES.INGREDIENTS,
    UPDATE_TYPES.IDENTIFIER,
    UPDATE_TYPES.CATEGORY,
    UPDATE_TYPES.PROMOTION,
    UPDATE_TYPES.NUTRITION,
  ],
  supposed_updates: [
    {
      update_type: UPDATE_TYPES.AGGREGATE_RATING,
      values: ["Rating"],
    },
    {
      update_type: UPDATE_TYPES.TAG_CATEGORY,
      values: ["Cuisine","Meal Type","Diet"],
    },
  ],
};
