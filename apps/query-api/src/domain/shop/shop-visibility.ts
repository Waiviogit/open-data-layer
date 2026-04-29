import type { UserShopVisibilityFlags } from '../../repositories/user-metadata.repository';

/** True when post-linked objects should be excluded for this `types` bucket. */
export function shouldHidePostLinkedObjects(
  types: readonly string[],
  flags: UserShopVisibilityFlags,
): boolean {
  const recipeOnly =
    types.length > 0 && types.every((t) => t === 'recipe') && types.includes('recipe');
  return recipeOnly ? flags.hide_recipe_objects : flags.hide_linked_objects;
}
