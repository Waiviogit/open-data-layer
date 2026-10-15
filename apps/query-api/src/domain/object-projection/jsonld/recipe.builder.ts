import type { ProjectedObject } from '../projected-object.types';
import { baseJsonLdFields, fieldString, stringArrayField } from './fields';

export function buildRecipeJsonLd(
  obj: ProjectedObject,
  canonical: string | null,
): Record<string, unknown> {
  const ingredients = stringArrayField(obj.fields, 'ingredients');
  const cookTime = fieldString(obj.fields, 'cookTime');
  const calories = fieldString(obj.fields, 'calories');
  const servings = fieldString(obj.fields, 'servings');

  return {
    ...baseJsonLdFields(obj, canonical, 'Recipe'),
    ...(ingredients.length > 0 ? { recipeIngredient: ingredients } : {}),
    ...(cookTime ? { cookTime } : {}),
    ...(servings ? { recipeYield: servings } : {}),
    ...(calories
      ? {
          nutrition: {
            '@type': 'NutritionInformation',
            calories,
          },
        }
      : {}),
  };
}
