import type { ObjectTypeRegistry } from './types';
import { OBJECT_TYPES } from './object-types';
import { HASHTAG_OBJECT_TYPE } from './object-types/hashtag';
import { CRYPTO_OBJECT_TYPE } from './object-types/crypto';
import { COMMODITY_OBJECT_TYPE } from './object-types/commodity';
import { CURRENCY_OBJECT_TYPE } from './object-types/currency';
import { STOCKS_OBJECT_TYPE } from './object-types/stocks';
import { INDICES_OBJECT_TYPE } from './object-types/indices';
import { APP_OBJECT_TYPE } from './object-types/app';
import { LIST_OBJECT_TYPE } from './object-types/list';
import { CURRENCIES_OBJECT_TYPE } from './object-types/currencies';
import { PRODUCT_OBJECT_TYPE } from './object-types/product';
import { DRINK_OBJECT_TYPE } from './object-types/drink';
import { PLACE_OBJECT_TYPE } from './object-types/place';
import { BUSINESS_OBJECT_TYPE } from './object-types/business';
import { CAR_OBJECT_TYPE } from './object-types/car';
import { PAGE_OBJECT_TYPE } from './object-types/page';
import { SERVICE_OBJECT_TYPE } from './object-types/service';
import { COMPANY_OBJECT_TYPE } from './object-types/company';
import { ORGANIZATION_OBJECT_TYPE } from './object-types/organization';
import { PERSON_OBJECT_TYPE } from './object-types/person';
import { HOTEL_OBJECT_TYPE } from './object-types/hotel';
import { MOTEL_OBJECT_TYPE } from './object-types/motel';
import { RESORT_OBJECT_TYPE } from './object-types/resort';
import { BANDB_OBJECT_TYPE } from './object-types/bandb';
import { RESTAURANT_OBJECT_TYPE } from './object-types/restaurant';
import { DISH_OBJECT_TYPE } from './object-types/dish';
import { CRYPTOPAIRS_OBJECT_TYPE } from './object-types/cryptopairs';
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
  [OBJECT_TYPES.CRYPTO]: CRYPTO_OBJECT_TYPE,
  [OBJECT_TYPES.COMMODITY]: COMMODITY_OBJECT_TYPE,
  [OBJECT_TYPES.CURRENCY]: CURRENCY_OBJECT_TYPE,
  [OBJECT_TYPES.STOCKS]: STOCKS_OBJECT_TYPE,
  [OBJECT_TYPES.INDICES]: INDICES_OBJECT_TYPE,
  [OBJECT_TYPES.APP]: APP_OBJECT_TYPE,
  [OBJECT_TYPES.LIST]: LIST_OBJECT_TYPE,
  [OBJECT_TYPES.CURRENCIES]: CURRENCIES_OBJECT_TYPE,
  [OBJECT_TYPES.PRODUCT]: PRODUCT_OBJECT_TYPE,
  [OBJECT_TYPES.DRINK]: DRINK_OBJECT_TYPE,
  [OBJECT_TYPES.PLACE]: PLACE_OBJECT_TYPE,
  [OBJECT_TYPES.BUSINESS]: BUSINESS_OBJECT_TYPE,
  [OBJECT_TYPES.CAR]: CAR_OBJECT_TYPE,
  [OBJECT_TYPES.PAGE]: PAGE_OBJECT_TYPE,
  [OBJECT_TYPES.SERVICE]: SERVICE_OBJECT_TYPE,
  [OBJECT_TYPES.COMPANY]: COMPANY_OBJECT_TYPE,
  [OBJECT_TYPES.ORGANIZATION]: ORGANIZATION_OBJECT_TYPE,
  [OBJECT_TYPES.PERSON]: PERSON_OBJECT_TYPE,
  [OBJECT_TYPES.HOTEL]: HOTEL_OBJECT_TYPE,
  [OBJECT_TYPES.MOTEL]: MOTEL_OBJECT_TYPE,
  [OBJECT_TYPES.RESORT]: RESORT_OBJECT_TYPE,
  [OBJECT_TYPES.BANDB]: BANDB_OBJECT_TYPE,
  [OBJECT_TYPES.RESTAURANT]: RESTAURANT_OBJECT_TYPE,
  [OBJECT_TYPES.DISH]: DISH_OBJECT_TYPE,
  [OBJECT_TYPES.CRYPTOPAIRS]: CRYPTOPAIRS_OBJECT_TYPE,
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
