import type { ObjectTypeRegistry } from './types';
import { OBJECT_TYPES } from './object-types';
import { HASHTAG_OBJECT_TYPE } from './object-types/hashtag';
import { LIST_OBJECT_TYPE } from './object-types/list';
import { PRODUCT_OBJECT_TYPE } from './object-types/product';
import { DRINK_OBJECT_TYPE } from './object-types/drink';
import { PLACE_OBJECT_TYPE } from './object-types/place';
import { BUSINESS_OBJECT_TYPE } from './object-types/business';
import { PAGE_OBJECT_TYPE } from './object-types/page';
import { SERVICE_OBJECT_TYPE } from './object-types/service';
import { PERSON_OBJECT_TYPE } from './object-types/person';
import { RESTAURANT_OBJECT_TYPE } from './object-types/restaurant';
import { DISH_OBJECT_TYPE } from './object-types/dish';
import { BOOK_OBJECT_TYPE } from './object-types/book';
import { WIDGET_OBJECT_TYPE } from './object-types/widget';
import { NEWSFEED_OBJECT_TYPE } from './object-types/newsfeed';
import { SHOP_OBJECT_TYPE } from './object-types/shop';
import { AFFILIATE_OBJECT_TYPE } from './object-types/affiliate';
import { WEBPAGE_OBJECT_TYPE } from './object-types/webpage';
import { MAP_OBJECT_TYPE } from './object-types/map';
import { LINK_OBJECT_TYPE } from './object-types/link';
import { RECIPE_OBJECT_TYPE } from './object-types/recipe';
import { GROUP_OBJECT_TYPE } from './object-types/group';
import { HTML_OBJECT_TYPE } from './object-types/html';
import { GOVERNANCE_OBJECT_TYPE } from './object-types/governance';

export const OBJECT_TYPE_REGISTRY: ObjectTypeRegistry = {
  [OBJECT_TYPES.HASHTAG]: HASHTAG_OBJECT_TYPE,
  [OBJECT_TYPES.LIST]: LIST_OBJECT_TYPE,
  [OBJECT_TYPES.PRODUCT]: PRODUCT_OBJECT_TYPE,
  [OBJECT_TYPES.DRINK]: DRINK_OBJECT_TYPE,
  [OBJECT_TYPES.PLACE]: PLACE_OBJECT_TYPE,
  [OBJECT_TYPES.BUSINESS]: BUSINESS_OBJECT_TYPE,
  [OBJECT_TYPES.PAGE]: PAGE_OBJECT_TYPE,
  [OBJECT_TYPES.SERVICE]: SERVICE_OBJECT_TYPE,
  [OBJECT_TYPES.PERSON]: PERSON_OBJECT_TYPE,
  [OBJECT_TYPES.RESTAURANT]: RESTAURANT_OBJECT_TYPE,
  [OBJECT_TYPES.DISH]: DISH_OBJECT_TYPE,
  [OBJECT_TYPES.BOOK]: BOOK_OBJECT_TYPE,
  [OBJECT_TYPES.WIDGET]: WIDGET_OBJECT_TYPE,
  [OBJECT_TYPES.NEWSFEED]: NEWSFEED_OBJECT_TYPE,
  [OBJECT_TYPES.SHOP]: SHOP_OBJECT_TYPE,
  [OBJECT_TYPES.AFFILIATE]: AFFILIATE_OBJECT_TYPE,
  [OBJECT_TYPES.WEBPAGE]: WEBPAGE_OBJECT_TYPE,
  [OBJECT_TYPES.MAP]: MAP_OBJECT_TYPE,
  [OBJECT_TYPES.LINK]: LINK_OBJECT_TYPE,
  [OBJECT_TYPES.RECIPE]: RECIPE_OBJECT_TYPE,
  [OBJECT_TYPES.GROUP]: GROUP_OBJECT_TYPE,
  [OBJECT_TYPES.HTML]: HTML_OBJECT_TYPE,
  [OBJECT_TYPES.GOVERNANCE]: GOVERNANCE_OBJECT_TYPE,
};
