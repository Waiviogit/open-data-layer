/**
 * Human-readable titles for left-rail blocks keyed by ODL `update_type`.
 * Uses literal strings aligned with {@link libs/core/src/update-registry/update-types.ts}
 * — do not import `@opden-data-layer/core` here (Next.js client bundles must avoid the core barrel).
 *
 * @see scripts/migrate-mongo-to-pg/objects/field-name-map.ts
 */

/** Labels keyed by `update_type` string for blocks tied to registry entries. */
const UPDATE_TYPE_TO_LABEL: Record<string, string> = {
  description: 'Description',
  aggregateRating: 'Rating',
  tagCategory: 'Categories',
  tagCategoryItem: 'Tags',
  imageGalleryItem: 'Gallery',
  price: 'Price',
  workHours: 'Hours',
  address: 'Address',
  geo: 'Map',
  website: 'Website',
  parent: 'Parent',
  link: 'Links',
  telephone: 'Phone',
  email: 'Email',
  walletAddress: 'Wallet',
  menuItem: 'Menu',
  sortCustom: 'Sort',
};

/** Labels for blocks keyed by internal rail kind (not always 1:1 with update_type). */
export const OBJECT_LEFT_RAIL_BLOCK_LABEL: Record<string, string> = {
  menuItems: 'Menu',
  description: 'Description',
  rating: 'Rating',
  tags: 'Tags',
  gallery: 'Gallery',
  price: 'Price',
  workHours: 'Hours',
  address: 'Address',
  geo: 'Map',
  websites: 'Website',
  parent: 'Parent',
  link: 'Links',
  phones: 'Phone',
  email: 'Email',
  walletAddress: 'Wallet',
};

export function labelForUpdateType(updateType: string): string {
  return UPDATE_TYPE_TO_LABEL[updateType] ?? humanizeUpdateType(updateType);
}

function humanizeUpdateType(updateType: string): string {
  if (!updateType.length) {
    return updateType;
  }
  const spaced = updateType.replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.slice(0, 1).toUpperCase() + spaced.slice(1);
}
