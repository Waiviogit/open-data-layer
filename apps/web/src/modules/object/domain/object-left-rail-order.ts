/**
 * Legacy display order for the left rail mirrors waivio `ObjectInfo`.
 *
 * Default types: menu cluster first (when present), then {@link ABOUT_SECTION_BLOCK_ORDER}.
 * Product-like types (`book`, `product`, `service`): parent/publisher, then
 * {@link NAVIGATE_SECTION_BLOCK_ORDER} (gallery → price → options), then menu, then about.
 * `book`: `author` immediately after header (legacy `By` authors); reading metadata stays after `websites`.
 *
 * @see tmp/waivio-frontend-legacy/src/client/app/Sidebar/ObjectInfo/ObjectInfo.js
 * (`galleryPriceOptionsSection` before `menuSection`; gallery/price omitted from `aboutSection`.)
 */

import { resolveEditModeBlockKinds } from '@/modules/object-updates/domain/edit-mode-block-order';

/** Object types that use the legacy “navigate” cluster (gallery / price / options) before menu. */
export const OPTIONS_OBJECT_TYPES = ['book', 'product', 'service'] as const;

export type OptionsObjectType = (typeof OPTIONS_OBJECT_TYPES)[number];

export const BOOK_OBJECT_TYPE = 'book' as const;

export const RECIPE_OBJECT_TYPE = 'recipe' as const;

export const SKILL_OBJECT_TYPE = 'skill' as const;

export const LIST_OBJECT_TYPE = 'list' as const;

export function isListObjectType(objectType: string): boolean {
  return objectType.trim() === LIST_OBJECT_TYPE;
}

export function isSkillObjectType(objectType: string): boolean {
  return objectType.trim() === SKILL_OBJECT_TYPE;
}

export function isOptionsObjectType(objectType: string): boolean {
  const normalized = objectType.trim();
  return (OPTIONS_OBJECT_TYPES as readonly string[]).includes(normalized);
}

export function isBookObjectType(objectType: string): boolean {
  return objectType.trim() === BOOK_OBJECT_TYPE;
}

export function isRecipeObjectType(objectType: string): boolean {
  return objectType.trim() === RECIPE_OBJECT_TYPE;
}

/**
 * Legacy `galleryPriceOptionsSection` order for product-like types.
 * compareAtPrice precedes price; sale follows price; options last in the cluster.
 */
export const NAVIGATE_SECTION_BLOCK_ORDER = [
  'gallery',
  'compareAtPrice',
  'price',
  'saleEvent',
  'options',
] as const;

export type NavigateSectionBlockId = (typeof NAVIGATE_SECTION_BLOCK_ORDER)[number];

const NAVIGATE_BLOCK_IDS = new Set<string>(NAVIGATE_SECTION_BLOCK_ORDER);

/** Name and title blocks precede the about stack (edit mode and view when set). */
export const HEADER_BLOCK_ORDER = ['name', 'title'] as const;

export type HeaderBlockId = (typeof HEADER_BLOCK_ORDER)[number];

/** Main about stack for non-special object types (subset implemented in ODL UI). */
export const ABOUT_SECTION_BLOCK_ORDER = [
  'image',
  'imageBackground',
  'status',
  'parent',
  'author',
  'publisher',
  'description',
  'category',
  'rating',
  'tags',
  'gallery',
  'price',
  'options',
  'compareAtPrice',
  'saleEvent',
  'calories',
  'budget',
  'cookTime',
  'ingredients',
  'nutrition',
  'workHours',
  'address',
  'geo',
  'websites',
  'productWeight',
  'size',
  'merchant',
  'brand',
  'manufacturer',
  'featureList',
  'link',
  'phones',
  'email',
  'walletAddress',
  'identifier',
  'productGroupId',
  'objectControl',
  'admins',
  'moderators',
  'trusted',
  'authorities',
  'whitelist',
  'restricted',
  'banned',
  'inheritsFrom',
  'validityCutoff',
] as const;

/**
 * Recipe view/edit about stack: practical facts → explanation → classification →
 * community signal → detailed recipe data.
 */
export const RECIPE_ABOUT_SECTION_BLOCK_ORDER = [
  'image',
  'imageBackground',
  'status',
  'parent',
  'cookTime',
  'budget',
  'calories',
  'nutrition',
  'description',
  'tags',
  'category',
  'rating',
  'ingredients',
  'gallery',
  'featureList',
  'identifier',
] as const;

/** Skill view/edit about stack: metadata fields after description. */
export const SKILL_ABOUT_SECTION_BLOCK_ORDER = [
  'image',
  'imageBackground',
  'status',
  'parent',
  'description',
  'license',
  'compatibility',
  'metadata',
  'allowedTools',
  'references',
  'tags',
  'gallery',
  'websites',
  'identifier',
  'delegation',
] as const;

export type SkillAboutSectionBlockId = (typeof SKILL_ABOUT_SECTION_BLOCK_ORDER)[number];

export type RecipeAboutSectionBlockId = (typeof RECIPE_ABOUT_SECTION_BLOCK_ORDER)[number];

/** Book-only about fields (not in generic about stack). */
export const BOOK_ABOUT_SECTION_BLOCK_ORDER = [
  'typicalAgeRange',
  'inLanguage',
  'datePublished',
  'printLength',
] as const;

export type BookAboutSectionBlockId = (typeof BOOK_ABOUT_SECTION_BLOCK_ORDER)[number];

/** Book view/edit: author hoisted to the top of the left rail (legacy `By` line). */
export const BOOK_HOISTED_AUTHOR_BLOCK_ORDER = ['author'] as const;

export type AboutSectionBlockId =
  | (typeof ABOUT_SECTION_BLOCK_ORDER)[number]
  | BookAboutSectionBlockId
  | RecipeAboutSectionBlockId
  | SkillAboutSectionBlockId;

/**
 * Menu / custom-sort cluster is rendered before the about stack (legacy `menuSection`).
 */
export const MENU_BLOCK_ID = 'menuItems' as const;

/** Legacy menu cluster: CTA buttons immediately after menu rows (not in about stack). */
export const MENU_CLUSTER_BLOCK_ORDER = ['button'] as const;

export type MenuClusterBlockId = (typeof MENU_CLUSTER_BLOCK_ORDER)[number];

/** Full left-rail order in edit mode for generic object types (empty slots when supported). */
export const EDIT_MODE_LEFT_RAIL_BLOCK_ORDER = [
  ...HEADER_BLOCK_ORDER,
  MENU_BLOCK_ID,
  ...MENU_CLUSTER_BLOCK_ORDER,
  ...ABOUT_SECTION_BLOCK_ORDER,
] as const;

/** List-type edit slots: sorting first, promotion in about cluster, pin/remove after gallery. */
export const LIST_EDIT_MODE_LEFT_RAIL_BLOCK_ORDER = [
  ...HEADER_BLOCK_ORDER,
  'sortCustom',
  'image',
  'imageBackground',
  'status',
  'parent',
  'description',
  'promotion',
  'tags',
  'gallery',
  'pin',
  'remove',
  'category',
  'rating',
  'workHours',
  'address',
  'geo',
  'websites',
  'link',
  'phones',
  'email',
  'walletAddress',
  'identifier',
  'delegation',
] as const;

export type ListEditModeLeftRailBlockId = (typeof LIST_EDIT_MODE_LEFT_RAIL_BLOCK_ORDER)[number];

export type EditModeLeftRailBlockId =
  | (typeof EDIT_MODE_LEFT_RAIL_BLOCK_ORDER)[number]
  | ListEditModeLeftRailBlockId
  | BookAboutSectionBlockId
  | NavigateSectionBlockId
  | SkillAboutSectionBlockId
  | 'parent'
  | 'publisher';

/** About-stack blocks for product-like types after the navigate cluster (no duplicate commerce blocks). */
export function optionsTypeAboutRemainderOrder(): readonly AboutSectionBlockId[] {
  const excluded = new Set<AboutSectionBlockId>([
    ...NAVIGATE_SECTION_BLOCK_ORDER,
    'parent',
    'publisher',
    'typicalAgeRange',
    'inLanguage',
    'datePublished',
    'printLength',
  ]);
  const rest = ABOUT_SECTION_BLOCK_ORDER.filter((id) => !excluded.has(id));
  const withoutDescription = rest.filter((id) => id !== 'description');
  return ['description', ...withoutDescription];
}

/** Book about stack: description first; reading metadata after `websites` (author hoisted separately). */
export function bookTypeAboutRemainderOrder(): readonly AboutSectionBlockId[] {
  const base = optionsTypeAboutRemainderOrder().filter((id) => id !== 'author');
  const websitesIdx = base.indexOf('websites');
  if (websitesIdx < 0) {
    return [...base, ...BOOK_ABOUT_SECTION_BLOCK_ORDER];
  }
  return [
    ...base.slice(0, websitesIdx + 1),
    ...BOOK_ABOUT_SECTION_BLOCK_ORDER,
    ...base.slice(websitesIdx + 1),
  ];
}

/** Edit-mode slot order; product-like types match legacy navigate-before-menu layout. */
export function resolveAboutSectionBlockOrder(
  objectType: string,
): readonly AboutSectionBlockId[] {
  if (isSkillObjectType(objectType)) {
    return SKILL_ABOUT_SECTION_BLOCK_ORDER;
  }
  if (isRecipeObjectType(objectType)) {
    return RECIPE_ABOUT_SECTION_BLOCK_ORDER;
  }
  return ABOUT_SECTION_BLOCK_ORDER;
}

/** Edit-mode slot order from core edit-field-groups catalog (view order unchanged). */
export function resolveEditModeLeftRailBlockOrder(
  objectType: string,
): readonly EditModeLeftRailBlockId[] {
  return resolveEditModeBlockKinds(objectType);
}

function isNavigateBlockId(id: AboutSectionBlockId): id is NavigateSectionBlockId {
  return NAVIGATE_BLOCK_IDS.has(id);
}

export { isNavigateBlockId };
