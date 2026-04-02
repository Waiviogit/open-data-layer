/**
 * Maps legacy Mongo `fields[].name` (camelCase) to ODL `update_type` (snake_case).
 * @see tmp/general.ts, libs/core/src/update-registry/update-types.ts
 */

/** Legacy field names that have no ODL update_type — skip with warning. */
export const SKIP_LEGACY_FIELD_NAMES = new Set([
  'body',
  'tagCloud',
  'tag',
  'webpage',
]);

/** Routed to object_authority, not object_updates. */
export const AUTHORITY_LEGACY_FIELD_NAME = 'authority';

/**
 * Every legacy name that should become an object_updates row (excluding authority).
 * companyId / productId both map to identifier with JSON reshape in value-strategies.
 */
export const LEGACY_FIELD_TO_UPDATE_TYPE: Record<string, string> = {
  map: 'map',
  tagCategory: 'tag_category',
  categoryItem: 'category_item',
  status: 'status',
  newsFilter: 'news_filter',
  rating: 'rating',
  title: 'title',
  description: 'description',
  name: 'name',
  parent: 'parent',
  galleryAlbum: 'gallery_album',
  galleryItem: 'gallery_item',
  avatar: 'avatar',
  website: 'website',
  background: 'background',
  address: 'address',
  link: 'link',
  phone: 'phone',
  email: 'email',
  price: 'price',
  button: 'button',
  workTime: 'work_time',
  chartid: 'chart_id',
  pageContent: 'page_content',
  listItem: 'list_item',
  menuItem: 'menu_item',
  sortCustom: 'sort_custom',
  blog: 'blog',
  form: 'form',
  companyId: 'identifier',
  productId: 'identifier',
  groupId: 'group_id',
  options: 'options',
  ageRange: 'age_range',
  publicationDate: 'publication_date',
  language: 'language',
  productWeight: 'product_weight',
  dimensions: 'dimensions',
  authors: 'authors',
  publisher: 'publisher',
  printLength: 'print_length',
  widget: 'widget',
  newsFeed: 'news_feed',
  departments: 'departments',
  merchant: 'merchant',
  manufacturer: 'manufacturer',
  brand: 'brand',
  features: 'features',
  pin: 'pin',
  remove: 'remove',
  shopFilter: 'shop_filter',
  related: 'related',
  addOn: 'add_on',
  featured: 'featured',
  similar: 'similar',
  affiliateButton: 'affiliate_button',
  affiliateProductIdTypes: 'affiliate_product_id_types',
  affiliateGeoArea: 'affiliate_geo_area',
  affiliateUrlTemplate: 'affiliate_url_template',
  affiliateCode: 'affiliate_code',
  mapRectangles: 'map_rectangles',
  mapObjectTypes: 'map_object_types',
  mapObjectTags: 'map_object_tags',
  mapMobileView: 'map_mobile_view',
  mapDesktopView: 'map_desktop_view',
  mapObjectsList: 'map_objects_list',
  walletAddress: 'wallet_address',
  delegation: 'delegation',
  url: 'url',
  calories: 'calories',
  budget: 'budget',
  cookingTime: 'cooking_time',
  cost: 'cost',
  recipeIngredients: 'recipe_ingredients',
  groupExpertise: 'group_expertise',
  groupFollowers: 'group_followers',
  groupFollowing: 'group_following',
  groupAdd: 'group_add',
  groupExclude: 'group_exclude',
  promotion: 'promotion',
  groupLastActivity: 'group_last_activity',
  groupMinExpertise: 'group_min_expertise',
  nutrition: 'nutrition',
  sale: 'sale',
  compareAtPrice: 'compare_at_price',
  htmlContent: 'html_content',
  contentPosition: 'content_position',
  contentView: 'content_view',
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
