import type { UpdateRegistry } from './types';
import { UPDATE_TYPES } from './update-types';
import { UPDATE_NAME } from './updates/name';
import { UPDATE_OPTIONS } from './updates/options';
import { UPDATE_AGE_RANGE } from './updates/age-range';
import { UPDATE_PUBLICATION_DATE } from './updates/publication-date';
import { UPDATE_GROUP_ID } from './updates/group-id';
import { UPDATE_IDENTIFIER } from './updates/identifier';
import { UPDATE_PRODUCT_WEIGHT } from './updates/weight';
import { UPDATE_DIMENSIONS } from './updates/dimensions';
import { UPDATE_AUTHORS } from './updates/authors';
import { UPDATE_PUBLISHER } from './updates/publisher';
import { UPDATE_PRINT_LENGTH } from './updates/print-length';
import { UPDATE_NEWS_FEED } from './updates/news-feed';
import { UPDATE_WIDGET } from './updates/widget';
import { UPDATE_MERCHANT } from './updates/merchant';
import { UPDATE_MANUFACTURER } from './updates/manufacturer';
import { UPDATE_BRAND } from './updates/brand';
import { UPDATE_FEATURES } from './updates/features';
import { UPDATE_RELATED } from './updates/related';
import { UPDATE_ADD_ON } from './updates/add-on';
import { UPDATE_SIMILAR } from './updates/similar';
import { UPDATE_PIN } from './updates/pin';
import { UPDATE_REMOVE } from './updates/remove';
import { UPDATE_SHOP_FILTER } from './updates/shop-filter';
import { UPDATE_MENU_ITEM } from './updates/menu-item';
import { UPDATE_AFFILIATE_BUTTON } from './updates/affiliate-button';
import { UPDATE_AFFILIATE_PRODUCT_ID_TYPES } from './updates/affiliate-product-id-types';
import { UPDATE_AFFILIATE_GEO_AREA } from './updates/affiliate-geo-area';
import { UPDATE_AFFILIATE_URL_TEMPLATE } from './updates/affiliate-url-template';
import { UPDATE_AFFILIATE_CODE } from './updates/affiliate-code';
import { UPDATE_MAP } from './updates/map';
import { UPDATE_MAP_OBJECT_TYPES } from './updates/map-object-types';
import { UPDATE_MAP_OBJECT_TAGS } from './updates/map-object-tags';
import { UPDATE_MAP_MOBILE_VIEW } from './updates/map-mobile-view';
import { UPDATE_MAP_DESKTOP_VIEW } from './updates/map-desktop-view';
import { UPDATE_MAP_RECTANGLES } from './updates/map-rectangles';
import { UPDATE_MAP_OBJECTS_LIST } from './updates/map-objects-list';
import { UPDATE_WALLET_ADDRESS } from './updates/wallet-address';
import { UPDATE_DELEGATION } from './updates/delegation';
import { UPDATE_URL } from './updates/url';
import { UPDATE_CALORIES } from './updates/calories';
import { UPDATE_BUDGET } from './updates/budget';
import { UPDATE_COOKING_TIME } from './updates/cooking-time';
import { UPDATE_RECIPE_INGREDIENTS } from './updates/recipe-ingredients';
import { UPDATE_GROUP_EXPERTISE } from './updates/group-expertise';
import { UPDATE_GROUP_FOLLOWERS } from './updates/group-followers';
import { UPDATE_GROUP_FOLLOWING } from './updates/group-following';
import { UPDATE_GROUP_ADD } from './updates/group-add';
import { UPDATE_GROUP_EXCLUDE } from './updates/group-exclude';
import { UPDATE_GROUP_LAST_ACTIVITY } from './updates/group-last-activity';
import { UPDATE_GROUP_MIN_EXPERTISE } from './updates/group-min-expertise';
import { UPDATE_PROMOTION } from './updates/promotion';
import { UPDATE_NUTRITION } from './updates/nutrition';
import { UPDATE_FEATURED } from './updates/featured';
import { UPDATE_SALE } from './updates/sale';
import { UPDATE_COMPARE_AT_PRICE } from './updates/compare-at-price';
import { UPDATE_CONTENT_POSITION } from './updates/content-position';
import { UPDATE_HTML_CONTENT } from './updates/html-content';
import { UPDATE_CONTENT_VIEW } from './updates/content-view';
import { UPDATE_STATUS } from './updates/status';
import { UPDATE_AVATAR } from './updates/avatar';
import { UPDATE_TITLE } from './updates/title';
import { UPDATE_DESCRIPTION } from './updates/description';
import { UPDATE_BACKGROUND } from './updates/background';
import { UPDATE_TAG_CATEGORY } from './updates/tag-category';
import { UPDATE_CATEGORY_ITEM } from './updates/category-item';
import { UPDATE_GALLERY_ALBUM } from './updates/gallery-album';
import { UPDATE_GALLERY_ITEM } from './updates/gallery-item';
import { UPDATE_PARENT } from './updates/parent';
import { UPDATE_LANGUAGE } from './updates/language';
import { UPDATE_DEPARTMENTS } from './updates/departments';
import { UPDATE_WEBSITE } from './updates/website';
import { UPDATE_RATING } from './updates/rating';
import { UPDATE_LIST_ITEM } from './updates/list-item';
import { UPDATE_PRICE } from './updates/price';
import { UPDATE_SORT_CUSTOM } from './updates/sort-custom';
import { UPDATE_ADDRESS } from './updates/address';
import { UPDATE_FORM } from './updates/form';
import { UPDATE_NEWS_FILTER } from './updates/news-filter';
import { UPDATE_WORK_TIME } from './updates/work-time';
import { UPDATE_BUTTON } from './updates/button';
import { UPDATE_PHONE } from './updates/phone';
import { UPDATE_LINK } from './updates/link';
import { UPDATE_EMAIL } from './updates/email';
import { UPDATE_PAGE_CONTENT } from './updates/page-content';
import { UPDATE_ADMINS } from './updates/admins';
import { UPDATE_TRUSTED } from './updates/trusted';
import { UPDATE_MODERATORS } from './updates/moderators';
import { UPDATE_AUTHORITIES } from './updates/authorities';
import { UPDATE_RESTRICTED } from './updates/restricted';
import { UPDATE_BANNED } from './updates/banned';
import { UPDATE_WHITELIST } from './updates/whitelist';
import { UPDATE_OBJECT_CONTROL } from './updates/object-control';
import { UPDATE_INHERITS_FROM } from './updates/inherits-from';
import { UPDATE_VALIDITY_CUTOFF } from './updates/validity-cutoff';

export const UPDATE_REGISTRY: UpdateRegistry = {
  [UPDATE_TYPES.NAME]: UPDATE_NAME,
  [UPDATE_TYPES.OPTIONS]: UPDATE_OPTIONS,
  [UPDATE_TYPES.AGE_RANGE]: UPDATE_AGE_RANGE,
  [UPDATE_TYPES.PUBLICATION_DATE]: UPDATE_PUBLICATION_DATE,
  [UPDATE_TYPES.GROUP_ID]: UPDATE_GROUP_ID,
  [UPDATE_TYPES.IDENTIFIER]: UPDATE_IDENTIFIER,
  [UPDATE_TYPES.PRODUCT_WEIGHT]: UPDATE_PRODUCT_WEIGHT,
  [UPDATE_TYPES.DIMENSIONS]: UPDATE_DIMENSIONS,
  [UPDATE_TYPES.AUTHORS]: UPDATE_AUTHORS,
  [UPDATE_TYPES.PUBLISHER]: UPDATE_PUBLISHER,
  [UPDATE_TYPES.PRINT_LENGTH]: UPDATE_PRINT_LENGTH,
  [UPDATE_TYPES.NEWS_FEED]: UPDATE_NEWS_FEED,
  [UPDATE_TYPES.WIDGET]: UPDATE_WIDGET,
  [UPDATE_TYPES.MERCHANT]: UPDATE_MERCHANT,
  [UPDATE_TYPES.MANUFACTURER]: UPDATE_MANUFACTURER,
  [UPDATE_TYPES.BRAND]: UPDATE_BRAND,
  [UPDATE_TYPES.FEATURES]: UPDATE_FEATURES,
  [UPDATE_TYPES.RELATED]: UPDATE_RELATED,
  [UPDATE_TYPES.ADD_ON]: UPDATE_ADD_ON,
  [UPDATE_TYPES.SIMILAR]: UPDATE_SIMILAR,
  [UPDATE_TYPES.PIN]: UPDATE_PIN,
  [UPDATE_TYPES.REMOVE]: UPDATE_REMOVE,
  [UPDATE_TYPES.SHOP_FILTER]: UPDATE_SHOP_FILTER,
  [UPDATE_TYPES.MENU_ITEM]: UPDATE_MENU_ITEM,
  [UPDATE_TYPES.AFFILIATE_BUTTON]: UPDATE_AFFILIATE_BUTTON,
  [UPDATE_TYPES.AFFILIATE_PRODUCT_ID_TYPES]: UPDATE_AFFILIATE_PRODUCT_ID_TYPES,
  [UPDATE_TYPES.AFFILIATE_GEO_AREA]: UPDATE_AFFILIATE_GEO_AREA,
  [UPDATE_TYPES.AFFILIATE_URL_TEMPLATE]: UPDATE_AFFILIATE_URL_TEMPLATE,
  [UPDATE_TYPES.AFFILIATE_CODE]: UPDATE_AFFILIATE_CODE,
  [UPDATE_TYPES.MAP]: UPDATE_MAP,
  [UPDATE_TYPES.MAP_OBJECT_TYPES]: UPDATE_MAP_OBJECT_TYPES,
  [UPDATE_TYPES.MAP_OBJECT_TAGS]: UPDATE_MAP_OBJECT_TAGS,
  [UPDATE_TYPES.MAP_MOBILE_VIEW]: UPDATE_MAP_MOBILE_VIEW,
  [UPDATE_TYPES.MAP_DESKTOP_VIEW]: UPDATE_MAP_DESKTOP_VIEW,
  [UPDATE_TYPES.MAP_RECTANGLES]: UPDATE_MAP_RECTANGLES,
  [UPDATE_TYPES.MAP_OBJECTS_LIST]: UPDATE_MAP_OBJECTS_LIST,
  [UPDATE_TYPES.WALLET_ADDRESS]: UPDATE_WALLET_ADDRESS,
  [UPDATE_TYPES.DELEGATION]: UPDATE_DELEGATION,
  [UPDATE_TYPES.URL]: UPDATE_URL,
  [UPDATE_TYPES.CALORIES]: UPDATE_CALORIES,
  [UPDATE_TYPES.BUDGET]: UPDATE_BUDGET,
  [UPDATE_TYPES.COOKING_TIME]: UPDATE_COOKING_TIME,
  [UPDATE_TYPES.RECIPE_INGREDIENTS]: UPDATE_RECIPE_INGREDIENTS,
  [UPDATE_TYPES.GROUP_EXPERTISE]: UPDATE_GROUP_EXPERTISE,
  [UPDATE_TYPES.GROUP_FOLLOWERS]: UPDATE_GROUP_FOLLOWERS,
  [UPDATE_TYPES.GROUP_FOLLOWING]: UPDATE_GROUP_FOLLOWING,
  [UPDATE_TYPES.GROUP_ADD]: UPDATE_GROUP_ADD,
  [UPDATE_TYPES.GROUP_EXCLUDE]: UPDATE_GROUP_EXCLUDE,
  [UPDATE_TYPES.GROUP_LAST_ACTIVITY]: UPDATE_GROUP_LAST_ACTIVITY,
  [UPDATE_TYPES.GROUP_MIN_EXPERTISE]: UPDATE_GROUP_MIN_EXPERTISE,
  [UPDATE_TYPES.PROMOTION]: UPDATE_PROMOTION,
  [UPDATE_TYPES.NUTRITION]: UPDATE_NUTRITION,
  [UPDATE_TYPES.FEATURED]: UPDATE_FEATURED,
  [UPDATE_TYPES.SALE]: UPDATE_SALE,
  [UPDATE_TYPES.COMPARE_AT_PRICE]: UPDATE_COMPARE_AT_PRICE,
  [UPDATE_TYPES.CONTENT_POSITION]: UPDATE_CONTENT_POSITION,
  [UPDATE_TYPES.HTML_CONTENT]: UPDATE_HTML_CONTENT,
  [UPDATE_TYPES.CONTENT_VIEW]: UPDATE_CONTENT_VIEW,
  [UPDATE_TYPES.STATUS]: UPDATE_STATUS,
  [UPDATE_TYPES.AVATAR]: UPDATE_AVATAR,
  [UPDATE_TYPES.TITLE]: UPDATE_TITLE,
  [UPDATE_TYPES.DESCRIPTION]: UPDATE_DESCRIPTION,
  [UPDATE_TYPES.BACKGROUND]: UPDATE_BACKGROUND,
  [UPDATE_TYPES.TAG_CATEGORY]: UPDATE_TAG_CATEGORY,
  [UPDATE_TYPES.CATEGORY_ITEM]: UPDATE_CATEGORY_ITEM,
  [UPDATE_TYPES.GALLERY_ALBUM]: UPDATE_GALLERY_ALBUM,
  [UPDATE_TYPES.GALLERY_ITEM]: UPDATE_GALLERY_ITEM,
  [UPDATE_TYPES.PARENT]: UPDATE_PARENT,
  [UPDATE_TYPES.LANGUAGE]: UPDATE_LANGUAGE,
  [UPDATE_TYPES.DEPARTMENTS]: UPDATE_DEPARTMENTS,
  [UPDATE_TYPES.WEBSITE]: UPDATE_WEBSITE,
  [UPDATE_TYPES.RATING]: UPDATE_RATING,
  [UPDATE_TYPES.LIST_ITEM]: UPDATE_LIST_ITEM,
  [UPDATE_TYPES.PRICE]: UPDATE_PRICE,
  [UPDATE_TYPES.SORT_CUSTOM]: UPDATE_SORT_CUSTOM,
  [UPDATE_TYPES.ADDRESS]: UPDATE_ADDRESS,
  [UPDATE_TYPES.FORM]: UPDATE_FORM,
  [UPDATE_TYPES.NEWS_FILTER]: UPDATE_NEWS_FILTER,
  [UPDATE_TYPES.WORK_TIME]: UPDATE_WORK_TIME,
  [UPDATE_TYPES.BUTTON]: UPDATE_BUTTON,
  [UPDATE_TYPES.PHONE]: UPDATE_PHONE,
  [UPDATE_TYPES.LINK]: UPDATE_LINK,
  [UPDATE_TYPES.EMAIL]: UPDATE_EMAIL,
  [UPDATE_TYPES.PAGE_CONTENT]: UPDATE_PAGE_CONTENT,
  [UPDATE_TYPES.ADMINS]: UPDATE_ADMINS,
  [UPDATE_TYPES.TRUSTED]: UPDATE_TRUSTED,
  [UPDATE_TYPES.MODERATORS]: UPDATE_MODERATORS,
  [UPDATE_TYPES.AUTHORITIES]: UPDATE_AUTHORITIES,
  [UPDATE_TYPES.RESTRICTED]: UPDATE_RESTRICTED,
  [UPDATE_TYPES.BANNED]: UPDATE_BANNED,
  [UPDATE_TYPES.WHITELIST]: UPDATE_WHITELIST,
  [UPDATE_TYPES.OBJECT_CONTROL]: UPDATE_OBJECT_CONTROL,
  [UPDATE_TYPES.INHERITS_FROM]: UPDATE_INHERITS_FROM,
  [UPDATE_TYPES.VALIDITY_CUTOFF]: UPDATE_VALIDITY_CUTOFF,
} satisfies UpdateRegistry;
