import {
  UPDATE_ADDRESS,
  UPDATE_ADMINS,
  UPDATE_DELEGATION,
  UPDATE_GEO,
  UPDATE_IMAGE,
  UPDATE_INGREDIENTS,
  UPDATE_MENU_ITEM,
  UPDATE_NAME,
  UPDATE_PARENT,
  UPDATE_TAG_CATEGORY_ITEM,
  UPDATE_WALLET_ADDRESS,
  WALLET_SYMBOLS,
} from '@opden-data-layer/core/update-registry';
import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import {
  initialFormValueForUpdateType,
  initialMenuItemFormValue,
  sanitizeMenuItemFormValue,
} from './menu-item-form-value';

import {
  coerceFormValueForValidation,
  getJsonFieldDescriptors,
  initialValueForDefinition,
  validateUpdateValue,
} from './update-value-form.utils';

describe('update-value-form.utils', () => {
  it('initialValueForDefinition returns empty string for text updates', () => {
    expect(initialValueForDefinition(UPDATE_NAME)).toBe('');
  });

  it('initialValueForDefinition returns empty string for user_ref updates', () => {
    expect(initialValueForDefinition(UPDATE_ADMINS)).toBe('');
    expect(initialValueForDefinition(UPDATE_DELEGATION)).toBe('');
  });

  it('initialValueForDefinition returns geo form defaults', () => {
    expect(initialValueForDefinition(UPDATE_GEO)).toEqual({
      latitude: '',
      longitude: '',
    });
  });

  it('getJsonFieldDescriptors returns shape fields for address', () => {
    const fields = getJsonFieldDescriptors(UPDATE_ADDRESS.schema);
    expect(fields?.map((f) => f.key).sort()).toEqual(
      ['country', 'locality', 'postal_code', 'state', 'street', 'suite'].sort(),
    );
  });

  it('validateUpdateValue accepts valid name text', () => {
    const result = validateUpdateValue(UPDATE_NAME, 'My Shop');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe('My Shop');
    }
  });

  it('validateUpdateValue rejects empty name', () => {
    expect(validateUpdateValue(UPDATE_NAME, '').success).toBe(false);
  });

  it('coerceFormValueForValidation parses geo strings to numbers', () => {
    const coerced = coerceFormValueForValidation(UPDATE_GEO, {
      latitude: '45.5',
      longitude: '-73.6',
    });
    expect(coerced).toEqual({ latitude: 45.5, longitude: -73.6 });
  });

  it('coerceFormValueForValidation treats null geo as empty coordinates', () => {
    const coerced = coerceFormValueForValidation(UPDATE_GEO, null);
    expect(coerced).toEqual({ latitude: NaN, longitude: NaN });
    expect(validateUpdateValue(UPDATE_GEO, null).success).toBe(false);
  });

  it('validateUpdateValue accepts valid geo', () => {
    const result = validateUpdateValue(UPDATE_GEO, {
      latitude: '10',
      longitude: '20',
    });
    expect(result.success).toBe(true);
  });

  it('initialFormValueForUpdateType returns menu item defaults', () => {
    expect(initialFormValueForUpdateType(UPDATE_TYPES.MENU_ITEM)).toEqual(
      initialMenuItemFormValue(),
    );
  });

  it('sanitizeMenuItemFormValue strips empty optional fields', () => {
    expect(
      sanitizeMenuItemFormValue({
        style: 'standard',
        title: '',
        image: '',
        link_to_object: 'obj-1',
        object_type: 'book',
        link_to_web: '',
      }),
    ).toEqual({
      style: 'standard',
      link_to_object: 'obj-1',
      object_type: 'book',
    });
  });

  it('coerceFormValueForValidation sanitizes menu item before validation', () => {
    const coerced = coerceFormValueForValidation(UPDATE_MENU_ITEM, {
      style: 'highlight',
      title: '',
      image: '',
      link_to_object: 'abc123',
      object_type: 'book',
    });
    expect(coerced).toEqual({
      style: 'highlight',
      link_to_object: 'abc123',
      object_type: 'book',
    });
  });

  it('validateUpdateValue accepts menu item with object link', () => {
    const result = validateUpdateValue(UPDATE_MENU_ITEM, {
      style: 'standard',
      link_to_object: 'obj-abc',
      object_type: 'book',
    });
    expect(result.success).toBe(true);
  });

  it('validateUpdateValue accepts menu item with web link and title', () => {
    const result = validateUpdateValue(UPDATE_MENU_ITEM, {
      style: 'icon',
      title: 'External',
      link_to_web: 'https://example.com',
    });
    expect(result.success).toBe(true);
  });

  it('validateUpdateValue accepts object_ref parent with object id string', () => {
    const result = validateUpdateValue(UPDATE_PARENT, 'obj-parent-abc');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe('obj-parent-abc');
    }
  });

  it('validateUpdateValue accepts walletAddress with enum symbol', () => {
    const result = validateUpdateValue(UPDATE_WALLET_ADDRESS, {
      symbol: WALLET_SYMBOLS[0],
      address: 'demo-hive-account',
    });
    expect(result.success).toBe(true);
  });

  it('validateUpdateValue rejects walletAddress with unknown symbol', () => {
    expect(
      validateUpdateValue(UPDATE_WALLET_ADDRESS, {
        symbol: 'Dogecoin',
        address: 'x',
      }).success,
    ).toBe(false);
  });

  it('validateUpdateValue accepts tagCategoryItem with existing category', () => {
    const result = validateUpdateValue(UPDATE_TAG_CATEGORY_ITEM, {
      category: 'Pros',
      value: 'Fast service',
    });
    expect(result.success).toBe(true);
  });

  it('validateUpdateValue rejects empty object_ref', () => {
    expect(validateUpdateValue(UPDATE_PARENT, '').success).toBe(false);
  });

  it('validateUpdateValue accepts user_ref with Hive account name', () => {
    const result = validateUpdateValue(UPDATE_ADMINS, 'alice');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe('alice');
    }
  });

  it('validateUpdateValue rejects empty user_ref', () => {
    expect(validateUpdateValue(UPDATE_ADMINS, '').success).toBe(false);
  });

  it('coerceFormValueForValidation treats user_ref as string', () => {
    expect(coerceFormValueForValidation(UPDATE_ADMINS, 'bob')).toBe('bob');
    expect(coerceFormValueForValidation(UPDATE_ADMINS, 42)).toBe('');
  });

  it('validateUpdateValue rejects menu item without a link', () => {
    expect(
      validateUpdateValue(UPDATE_MENU_ITEM, { style: 'standard' }).success,
    ).toBe(false);
  });

  it('validateUpdateValue accepts image update prefilled with plain URL string', () => {
    const result = validateUpdateValue(
      UPDATE_IMAGE,
      'https://waivio.nyc3.digitaloceanspaces.com/demo.jpg',
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toEqual({
        url: 'https://waivio.nyc3.digitaloceanspaces.com/demo.jpg',
      });
    }
  });

  it('validateUpdateValue accepts image update prefilled with url object', () => {
    const result = validateUpdateValue(UPDATE_IMAGE, {
      url: 'https://example.com/avatar.png',
    });
    expect(result.success).toBe(true);
  });

  it('validateUpdateValue accepts valid address json fields', () => {
    const raw = {
      street: '1 Main St',
      locality: 'Montreal',
      postal_code: 'H1A',
      country: 'CA',
      state: '',
      suite: '',
    };
    const result = validateUpdateValue(UPDATE_ADDRESS, raw);
    expect(result.success).toBe(true);
  });

  it('initialValueForDefinition returns empty string for root string array json', () => {
    expect(initialValueForDefinition(UPDATE_INGREDIENTS)).toBe('');
  });

  it('validateUpdateValue accepts ingredients from newline text', () => {
    const result = validateUpdateValue(
      UPDATE_INGREDIENTS,
      'flour\nsugar\n',
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toEqual(['flour', 'sugar']);
    }
  });

  it('validateUpdateValue rejects empty ingredients', () => {
    expect(validateUpdateValue(UPDATE_INGREDIENTS, '').success).toBe(false);
    expect(validateUpdateValue(UPDATE_INGREDIENTS, '\n\n').success).toBe(
      false,
    );
  });
});
