import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import {
  canPublishObject,
  validatePublishReadiness,
} from './object-health-score';
import type { FieldEntry } from './object-create.types';

function field(updateType: string, value: unknown): FieldEntry {
  return {
    entryKey: updateType,
    updateType,
    value,
    locale: 'en',
  };
}

const PREFIX = 'abc';
const FULL_ID = `${PREFIX}-pasta`;

describe('validatePublishReadiness', () => {
  it('returns false without object type', () => {
    expect(
      validatePublishReadiness(null, [], FULL_ID, PREFIX).ready,
    ).toBe(false);
  });

  it('requires object id slug from name', () => {
    expect(
      validatePublishReadiness(
        'recipe',
        [
          field(UPDATE_TYPES.NAME, 'Pasta'),
          field(UPDATE_TYPES.DESCRIPTION, 'Tasty'),
          field(UPDATE_TYPES.IMAGE, { url: 'https://example.com/a.jpg' }),
          field(UPDATE_TYPES.INGREDIENTS, 'flour\nsalt'),
        ],
        PREFIX,
        PREFIX,
      ).missingObjectIdSlug,
    ).toBe(true);
  });

  it('requires name, description, image, and ingredients for recipe', () => {
    expect(validatePublishReadiness('recipe', [], FULL_ID, PREFIX).ready).toBe(
      false,
    );
    expect(
      validatePublishReadiness(
        'recipe',
        [
          field(UPDATE_TYPES.NAME, 'Pasta'),
          field(UPDATE_TYPES.DESCRIPTION, 'Tasty'),
          field(UPDATE_TYPES.IMAGE, { url: 'https://example.com/a.jpg' }),
        ],
        FULL_ID,
        PREFIX,
      ).ready,
    ).toBe(false);
    expect(
      validatePublishReadiness(
        'recipe',
        [
          field(UPDATE_TYPES.NAME, 'Pasta'),
          field(UPDATE_TYPES.DESCRIPTION, 'Tasty'),
          field(UPDATE_TYPES.IMAGE, { url: 'https://example.com/a.jpg' }),
          field(UPDATE_TYPES.INGREDIENTS, 'flour\nsalt'),
        ],
        FULL_ID,
        PREFIX,
      ).ready,
    ).toBe(true);
  });

  it('blocks publish when a tag row has no value', () => {
    const result = validatePublishReadiness(
      'recipe',
      [
        field(UPDATE_TYPES.NAME, 'Pasta'),
        field(UPDATE_TYPES.DESCRIPTION, 'Tasty'),
        field(UPDATE_TYPES.IMAGE, { url: 'https://example.com/a.jpg' }),
        field(UPDATE_TYPES.INGREDIENTS, 'flour\nsalt'),
        field(UPDATE_TYPES.TAG_CATEGORY_ITEM, {
          category: 'Cuisine',
          value: '',
        }),
      ],
      FULL_ID,
      PREFIX,
    );
    expect(result.ready).toBe(false);
    expect(result.incompleteTagItems).toBe(1);
  });

  it('rejects invalid image url even when field looks filled', () => {
    const result = validatePublishReadiness(
      'recipe',
      [
        field(UPDATE_TYPES.NAME, 'Pasta'),
        field(UPDATE_TYPES.DESCRIPTION, 'Tasty'),
        field(UPDATE_TYPES.IMAGE, { url: 'not-a-valid-url' }),
        field(UPDATE_TYPES.INGREDIENTS, 'flour'),
      ],
      FULL_ID,
      PREFIX,
    );
    expect(result.ready).toBe(false);
    expect(result.invalidRequired).toContain('image');
  });

  it('rejects empty ingredients lines', () => {
    const result = validatePublishReadiness(
      'recipe',
      [
        field(UPDATE_TYPES.NAME, 'Pasta'),
        field(UPDATE_TYPES.DESCRIPTION, 'Tasty'),
        field(UPDATE_TYPES.IMAGE, { url: 'https://example.com/a.jpg' }),
        field(UPDATE_TYPES.INGREDIENTS, '\n\n'),
      ],
      FULL_ID,
      PREFIX,
    );
    expect(result.ready).toBe(false);
    expect(result.missingRequired).toContain('ingredients');
  });
});

describe('canPublishObject', () => {
  it('delegates to validatePublishReadiness with object id', () => {
    expect(
      canPublishObject(
        'recipe',
        [
          field(UPDATE_TYPES.NAME, 'Pasta'),
          field(UPDATE_TYPES.DESCRIPTION, 'Tasty'),
          field(UPDATE_TYPES.IMAGE, { url: 'https://example.com/a.jpg' }),
          field(UPDATE_TYPES.INGREDIENTS, 'flour\nsalt'),
        ],
        FULL_ID,
        PREFIX,
      ),
    ).toBe(true);
  });
});
