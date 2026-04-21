/**
 * Maps legacy Mongo `fields[].name` (camelCase) to ODL `update_type` (lower camelCase, aligned with `UPDATE_TYPES`).
 * @see tmp/general.ts, libs/core/src/update-registry/update-types.ts
 */

/** Legacy field names that have no ODL update_type — skip with warning. */
export const SKIP_LEGACY_FIELD_NAMES = new Set([
  'body',
  'tagCloud',
  'tag',
  'webpage',
  /** Removed from ODL update registry — do not migrate. */
  'chartid',
  'blog',
  'cost',
]);

/** Routed to object_authority, not object_updates. */
export const AUTHORITY_LEGACY_FIELD_NAME = 'authority';

/**
 * Every legacy name that should become an object_updates row (excluding authority).
 * companyId / productId both map to identifier with JSON reshape in value-strategies.
 */
export const LEGACY_FIELD_TO_UPDATE_TYPE: Record<string, string> = {
  map: 'geo',
  tagCategory: 'tagCategory',
  categoryItem: 'tagCategoryItem',
  status: 'status',
  newsFilter: 'newsFilter',
  rating: 'aggregateRating',
  title: 'title',
  description: 'description',
  name: 'name',
  parent: 'parent',
  galleryAlbum: 'imageGallery',
  galleryItem: 'imageGalleryItem',
  avatar: 'image',
  website: 'website',
  background: 'imageBackground',
  address: 'address',
  link: 'link',
  phone: 'telephone',
  email: 'email',
  price: 'price',
  button: 'button',
  workTime: 'workHours',
  pageContent: 'pageContent',
  listItem: 'listItem',
  menuItem: 'menuItem',
  sortCustom: 'sortCustom',
  form: 'form',
  companyId: 'identifier',
  productId: 'identifier',
  groupId: 'productGroupId',
  options: 'option',
  ageRange: 'typicalAgeRange',
  publicationDate: 'datePublished',
  language: 'inLanguage',
  productWeight: 'productWeight',
  dimensions: 'size',
  authors: 'author',
  publisher: 'publisher',
  printLength: 'printLength',
  widget: 'widget',
  newsFeed: 'newsFeed',
  departments: 'category',
  merchant: 'merchant',
  manufacturer: 'manufacturer',
  brand: 'brand',
  features: 'featureList',
  pin: 'pin',
  remove: 'remove',
  shopFilter: 'shopFilter',
  related: 'isRelatedTo',
  addOn: 'addOn',
  featured: 'featured',
  similar: 'isSimilarTo',
  affiliateButton: 'affiliateButton',
  affiliateProductIdTypes: 'affiliateProductIdTypes',
  affiliateGeoArea: 'affiliateGeoArea',
  affiliateUrlTemplate: 'affiliateUrlTemplate',
  affiliateCode: 'affiliateCode',
  mapRectangles: 'mapRectangles',
  mapObjectTypes: 'mapObjectTypes',
  mapObjectTags: 'mapObjectTags',
  mapMobileView: 'mapMobileView',
  mapDesktopView: 'mapDesktopView',
  mapObjectsList: 'mapObjectsList',
  walletAddress: 'walletAddress',
  delegation: 'delegation',
  url: 'url',
  calories: 'calories',
  budget: 'budget',
  cookingTime: 'cookTime',
  recipeIngredients: 'ingredients',
  groupExpertise: 'groupExpertise',
  groupFollowers: 'groupFollowers',
  groupFollowing: 'groupFollowing',
  groupAdd: 'groupAdd',
  groupExclude: 'groupExclude',
  promotion: 'promotion',
  groupLastActivity: 'groupLastActivity',
  groupMinExpertise: 'groupMinExpertise',
  nutrition: 'nutrition',
  sale: 'saleEvent',
  compareAtPrice: 'compareAtPrice',
  htmlContent: 'htmlContent',
  contentPosition: 'contentPosition',
  contentView: 'contentView',
};

export function resolveUpdateType(legacyFieldName: string): string | null {
  if (legacyFieldName === AUTHORITY_LEGACY_FIELD_NAME) {
    return null;
  }
  if (SKIP_LEGACY_FIELD_NAMES.has(legacyFieldName)) {
    return null;
  }
  return LEGACY_FIELD_TO_UPDATE_TYPE[legacyFieldName] ?? null;
}
