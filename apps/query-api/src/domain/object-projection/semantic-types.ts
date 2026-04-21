import { OBJECT_TYPES } from '@opden-data-layer/core';

/** Maps internal `object_type` to a schema.org-style semantic type for presentation. */
export const SEMANTIC_TYPE_BY_OBJECT_TYPE: Partial<Record<string, string>> = {
  [OBJECT_TYPES.PERSON]: 'schema:Person',
  [OBJECT_TYPES.PLACE]: 'schema:Place',
  [OBJECT_TYPES.BUSINESS]: 'schema:LocalBusiness',
  [OBJECT_TYPES.PRODUCT]: 'schema:Product',
  [OBJECT_TYPES.RECIPE]: 'schema:Recipe',
  [OBJECT_TYPES.RESTAURANT]: 'schema:Restaurant',
  [OBJECT_TYPES.BOOK]: 'schema:Book',
  [OBJECT_TYPES.SERVICE]: 'schema:Service',
  [OBJECT_TYPES.SHOP]: 'schema:Store',
  [OBJECT_TYPES.PAGE]: 'schema:WebPage',
  [OBJECT_TYPES.WEBPAGE]: 'schema:WebPage',
  [OBJECT_TYPES.DISH]: 'schema:MenuItem',
  [OBJECT_TYPES.DRINK]: 'schema:MenuItem',
  [OBJECT_TYPES.GROUP]: 'schema:Organization',
  [OBJECT_TYPES.MAP]: 'schema:Map',
  [OBJECT_TYPES.LINK]: 'schema:WebPage',
  [OBJECT_TYPES.HTML]: 'schema:WebPage',
  [OBJECT_TYPES.NEWSFEED]: 'schema:CollectionPage',
  [OBJECT_TYPES.WIDGET]: 'schema:WebPage',
  [OBJECT_TYPES.LIST]: 'schema:ItemList',
  [OBJECT_TYPES.AFFILIATE]: 'schema:WebPage',
};
