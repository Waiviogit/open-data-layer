/** Grouped categories for the object type selector. */
export const OBJECT_TYPE_GROUPS: readonly {
  label: string;
  types: readonly string[];
}[] = [
  {
    label: 'Popular',
    types: ['recipe', 'place', 'person', 'product', 'business', 'restaurant'],
  },
  {
    label: 'Commerce',
    types: ['shop', 'affiliate', 'service', 'dish', 'drink'],
  },
  {
    label: 'Content',
    types: ['page', 'book', 'webpage', 'newsfeed', 'html'],
  },
  {
    label: 'Social',
    types: ['group', 'hashtag', 'governance'],
  },
  {
    label: 'Data',
    types: ['map', 'list', 'link', 'widget'],
  },
] as const;

/** Featured types shown first in the type selector grid. */
export const FEATURED_OBJECT_TYPES = [
  'recipe',
  'place',
  'person',
  'product',
  'page',
  'business',
  'restaurant',
  'book',
] as const;

/** Human-readable labels for object type cards (registry only has machine descriptions). */
export const OBJECT_TYPE_DISPLAY_LABEL: Record<string, string> = {
  recipe: 'Recipe',
  place: 'Place',
  person: 'Person',
  product: 'Product',
  page: 'Page',
  business: 'Business',
  restaurant: 'Restaurant',
  book: 'Book',
  dish: 'Dish',
  drink: 'Drink',
  service: 'Service',
  shop: 'Shop',
  list: 'List',
  map: 'Map',
  link: 'Link',
  group: 'Group',
  hashtag: 'Hashtag',
  affiliate: 'Affiliate',
  webpage: 'Webpage',
  widget: 'Widget',
  newsfeed: 'Newsfeed',
  html: 'HTML',
  governance: 'Governance',
};

export function labelForObjectType(objectType: string): string {
  return OBJECT_TYPE_DISPLAY_LABEL[objectType] ?? objectType;
}
