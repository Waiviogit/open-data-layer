import { UPDATE_TYPES } from './update-types';
import { UPDATE_REGISTRY } from './update-registry';
import {
  EDIT_GROUP_FIELD_ORDER,
  EDIT_MODE_UPDATE_TYPE_ORDER,
  resolveEditGroup,
  resolveEditModeUpdateTypes,
  UPDATE_TYPE_TO_EDIT_GROUP,
} from './edit-field-groups';

describe('edit-field-groups', () => {
  it('maps every registry update_type exactly once', () => {
    const registryKeys = Object.keys(UPDATE_REGISTRY).sort();
    const catalogKeys = Object.keys(UPDATE_TYPE_TO_EDIT_GROUP).sort();
    expect(catalogKeys).toEqual(registryKeys);
  });

  it('has no duplicate update_types across groups', () => {
    const all = EDIT_MODE_UPDATE_TYPE_ORDER;
    expect(new Set(all).size).toBe(all.length);
  });

  it('places price in visit for restaurant', () => {
    expect(resolveEditGroup(UPDATE_TYPES.PRICE, 'restaurant')).toBe('visit');
    expect(resolveEditGroup(UPDATE_TYPES.PRICE, 'product')).toBe('commerce');
  });

  it('orders restaurant left-rail update types per venue layout', () => {
    const restaurantSupported = [
      UPDATE_TYPES.NAME,
      UPDATE_TYPES.TITLE,
      UPDATE_TYPES.IMAGE,
      UPDATE_TYPES.IMAGE_BACKGROUND,
      UPDATE_TYPES.PARENT,
      UPDATE_TYPES.MENU_ITEM,
      UPDATE_TYPES.BUTTON,
      UPDATE_TYPES.DESCRIPTION,
      UPDATE_TYPES.AGGREGATE_RATING,
      UPDATE_TYPES.TAG_CATEGORY,
      UPDATE_TYPES.TAG_CATEGORY_ITEM,
      UPDATE_TYPES.IMAGE_GALLERY_ITEM,
      UPDATE_TYPES.PRICE,
      UPDATE_TYPES.WORK_HOURS,
      UPDATE_TYPES.ADDRESS,
      UPDATE_TYPES.GEO,
      UPDATE_TYPES.WEBSITE,
      UPDATE_TYPES.LINK,
      UPDATE_TYPES.TELEPHONE,
      UPDATE_TYPES.EMAIL,
      UPDATE_TYPES.WALLET_ADDRESS,
      UPDATE_TYPES.IDENTIFIER,
      UPDATE_TYPES.STATUS,
    ];

    const order = resolveEditModeUpdateTypes('restaurant', restaurantSupported);

    expect(order.indexOf(UPDATE_TYPES.NAME)).toBeLessThan(order.indexOf(UPDATE_TYPES.TITLE));
    expect(order.indexOf(UPDATE_TYPES.IMAGE_BACKGROUND)).toBeLessThan(
      order.indexOf(UPDATE_TYPES.PARENT),
    );
    expect(order.indexOf(UPDATE_TYPES.DESCRIPTION)).toBeLessThan(
      order.indexOf(UPDATE_TYPES.AGGREGATE_RATING),
    );
    expect(order.indexOf(UPDATE_TYPES.IMAGE_GALLERY_ITEM)).toBeLessThan(
      order.indexOf(UPDATE_TYPES.PRICE),
    );
    expect(order.indexOf(UPDATE_TYPES.PRICE)).toBeLessThan(order.indexOf(UPDATE_TYPES.WORK_HOURS));
    expect(order.indexOf(UPDATE_TYPES.GEO)).toBeLessThan(order.indexOf(UPDATE_TYPES.WEBSITE));
    expect(order.indexOf(UPDATE_TYPES.EMAIL)).toBeLessThan(
      order.indexOf(UPDATE_TYPES.WALLET_ADDRESS),
    );
    expect(order.indexOf(UPDATE_TYPES.WALLET_ADDRESS)).toBeLessThan(
      order.indexOf(UPDATE_TYPES.IDENTIFIER),
    );
  });

  it('places productGroupId in the object group after identifier', () => {
    expect(resolveEditGroup(UPDATE_TYPES.PRODUCT_GROUP_ID, 'product')).toBe('object');

    const order = resolveEditModeUpdateTypes('product', [
      UPDATE_TYPES.IDENTIFIER,
      UPDATE_TYPES.PRODUCT_GROUP_ID,
      UPDATE_TYPES.STATUS,
    ]);
    expect(order.indexOf(UPDATE_TYPES.PRODUCT_GROUP_ID)).toBe(
      order.indexOf(UPDATE_TYPES.IDENTIFIER) + 1,
    );
    expect(EDIT_GROUP_FIELD_ORDER.object).toContain(UPDATE_TYPES.PRODUCT_GROUP_ID);
    expect(EDIT_GROUP_FIELD_ORDER.commerce).not.toContain(UPDATE_TYPES.PRODUCT_GROUP_ID);
  });

  it('keeps price in commerce for product', () => {
    const withPrice = resolveEditModeUpdateTypes('product', [
      UPDATE_TYPES.IMAGE_GALLERY_ITEM,
      UPDATE_TYPES.PRICE,
      UPDATE_TYPES.OPTION,
    ]);

    expect(withPrice.indexOf(UPDATE_TYPES.PRICE)).toBeGreaterThanOrEqual(0);
    expect(withPrice.indexOf(UPDATE_TYPES.OPTION)).toBeGreaterThan(withPrice.indexOf(UPDATE_TYPES.PRICE));
    expect(resolveEditGroup(UPDATE_TYPES.PRICE, 'product')).toBe('commerce');

    const commerceFields = EDIT_GROUP_FIELD_ORDER.commerce;
    expect(commerceFields).toContain(UPDATE_TYPES.PRICE);
  });

  it('filters to supported updates only', () => {
    const order = resolveEditModeUpdateTypes('restaurant', [
      UPDATE_TYPES.NAME,
      UPDATE_TYPES.DESCRIPTION,
    ]);
    expect(order).toEqual([UPDATE_TYPES.NAME, UPDATE_TYPES.DESCRIPTION]);
  });
});
