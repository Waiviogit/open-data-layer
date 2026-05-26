import { OBJECT_TYPES } from '@opden-data-layer/core';

import type { ProjectedObject } from '../projected-object.types';
import { buildBaseThingJsonLd } from './base-thing.builder';
import { buildBookJsonLd } from './book.builder';
import { buildMenuItemJsonLd, buildProductJsonLd } from './product.builder';
import { buildPersonJsonLd } from './person.builder';
import { buildPlaceJsonLd } from './place.builder';
import { buildRecipeJsonLd } from './recipe.builder';
import { buildServiceJsonLd } from './service.builder';
import { buildShopJsonLd } from './shop.builder';

export function buildObjectJsonLd(
  obj: ProjectedObject,
  canonical: string | null,
): Record<string, unknown> {
  switch (obj.object_type) {
    case OBJECT_TYPES.PRODUCT:
      return buildProductJsonLd(obj, canonical);
    case OBJECT_TYPES.RECIPE:
      return buildRecipeJsonLd(obj, canonical);
    case OBJECT_TYPES.BOOK:
      return buildBookJsonLd(obj, canonical);
    case OBJECT_TYPES.RESTAURANT:
      return buildPlaceJsonLd(obj, canonical, 'Restaurant');
    case OBJECT_TYPES.PLACE:
      return buildPlaceJsonLd(obj, canonical, 'Place');
    case OBJECT_TYPES.BUSINESS:
      return buildPlaceJsonLd(obj, canonical, 'LocalBusiness');
    case OBJECT_TYPES.DISH:
    case OBJECT_TYPES.DRINK:
      return buildMenuItemJsonLd(obj, canonical);
    case OBJECT_TYPES.PERSON:
      return buildPersonJsonLd(obj, canonical);
    case OBJECT_TYPES.SERVICE:
      return buildServiceJsonLd(obj, canonical);
    case OBJECT_TYPES.SHOP:
      return buildShopJsonLd(obj, canonical);
    default:
      return buildBaseThingJsonLd(obj, canonical);
  }
}
