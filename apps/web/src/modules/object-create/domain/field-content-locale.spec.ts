import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import {
  applyContentLocaleToFields,
  isLocalizableUpdateType,
} from './field-content-locale';
import type { FieldEntry } from './object-create.types';

describe('field-content-locale', () => {
  it('sets locale on localizable fields only', () => {
    const fields: FieldEntry[] = [
      {
        entryKey: 'gallery:0',
        updateType: UPDATE_TYPES.IMAGE_GALLERY_ITEM,
        value: {},
      },
      {
        entryKey: 'desc:0',
        updateType: UPDATE_TYPES.DESCRIPTION,
        value: 'y',
        locale: 'en-US',
      },
    ];
    const next = applyContentLocaleToFields(fields, 'ru-RU');
    expect(next[0]?.locale).toBeUndefined();
    expect(next[1]?.locale).toBe('ru-RU');
  });

  it('detects localizable update types from registry', () => {
    expect(isLocalizableUpdateType(UPDATE_TYPES.DESCRIPTION)).toBe(true);
    expect(isLocalizableUpdateType(UPDATE_TYPES.IMAGE_GALLERY_ITEM)).toBe(
      false,
    );
  });
});
