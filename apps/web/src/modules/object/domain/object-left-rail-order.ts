/**
 * Legacy display order for the left rail “about” stack mirrors waivio `ObjectInfo`:
 * menu cluster first (when present), then {@link ABOUT_SECTION_BLOCK_ORDER}.
 *
 * @see tmp/waivio-frontend-legacy/src/client/app/Sidebar/ObjectInfo/ObjectInfo.js
 * (`menuSection` before `aboutSection`; inside `aboutSection`, address then map.)
 */

/** Main about stack for non-special object types (subset implemented in ODL UI). */
export const ABOUT_SECTION_BLOCK_ORDER = [
  'parent',
  'description',
  'rating',
  'tags',
  'gallery',
  'price',
  'workHours',
  'address',
  'geo',
  'websites',
  'link',
  'phones',
  'email',
  'walletAddress',
  'identifier',
] as const;

export type AboutSectionBlockId = (typeof ABOUT_SECTION_BLOCK_ORDER)[number];

/**
 * Menu / custom-sort cluster is rendered before the about stack (legacy `menuSection`).
 */
export const MENU_BLOCK_ID = 'menuItems' as const;
