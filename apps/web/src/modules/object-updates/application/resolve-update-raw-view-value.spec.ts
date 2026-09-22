import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import {
  isCollapsedRawJsonUpdate,
  resolveUpdateRawViewValue,
} from './resolve-update-raw-view-value';

describe('resolveUpdateRawViewValue', () => {
  it('prefers value_json when both are set', () => {
    expect(
      resolveUpdateRawViewValue({
        value_json: { foo: 1 },
        value_geo: { latitude: 1, longitude: 2 },
      }),
    ).toEqual({ foo: 1 });
  });

  it('returns value_geo when value_json is null', () => {
    expect(
      resolveUpdateRawViewValue({
        value_json: null,
        value_geo: { latitude: 49.28, longitude: -123.12 },
      }),
    ).toEqual({ latitude: 49.28, longitude: -123.12 });
  });

  it('returns null when neither value is set', () => {
    expect(
      resolveUpdateRawViewValue({
        value_json: null,
        value_geo: null,
      }),
    ).toBeNull();
  });
});

describe('isCollapsedRawJsonUpdate', () => {
  it.each([
    UPDATE_TYPES.IMAGE,
    UPDATE_TYPES.IMAGE_BACKGROUND,
    UPDATE_TYPES.IMAGE_GALLERY_ITEM,
    UPDATE_TYPES.GEO,
  ])('collapses raw JSON for %s', (updateType) => {
    expect(isCollapsedRawJsonUpdate(updateType)).toBe(true);
  });

  it.each([UPDATE_TYPES.IMAGE_GALLERY, UPDATE_TYPES.ADDRESS, UPDATE_TYPES.MAP_OBJECTS_LIST])(
    'shows raw JSON immediately for %s',
    (updateType) => {
      expect(isCollapsedRawJsonUpdate(updateType)).toBe(false);
    },
  );
});
