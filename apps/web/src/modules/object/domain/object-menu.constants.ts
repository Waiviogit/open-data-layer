/** Object types that open in the host object's center column (legacy menuList / menuPage). */
export const MENU_IN_HOST_TYPES = new Set([
  'list',
  'page',
  'html',
  'newsfeed',
  'widget',
  'webpage',
  'map',
]);

export function isMenuInHostTargetType(objectType: string | undefined | null): boolean {
  const type = objectType?.trim() ?? '';
  return type.length > 0 && MENU_IN_HOST_TYPES.has(type);
}
