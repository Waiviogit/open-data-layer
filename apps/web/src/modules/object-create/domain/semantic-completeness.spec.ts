import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import { computeSemanticCompleteness } from './semantic-completeness';
import type { FieldEntry } from './object-create.types';

function field(updateType: string, value: unknown): FieldEntry {
  return {
    entryKey: updateType,
    updateType,
    value,
    locale: 'en-US',
  };
}

function ratingFor(
  result: ReturnType<typeof computeSemanticCompleteness>,
  id: string,
) {
  return result.dimensions.find((d) => d.id === id)?.rating;
}

describe('computeSemanticCompleteness', () => {
  it('returns all missing when no object type', () => {
    const result = computeSemanticCompleteness(null, []);
    expect(result.overallPercent).toBe(0);
    expect(result.dimensions.every((d) => d.rating === 'missing')).toBe(true);
  });

  it('rates identity and media good for filled recipe core fields', () => {
    const result = computeSemanticCompleteness('recipe', [
      field(UPDATE_TYPES.NAME, 'Pasta'),
      field(UPDATE_TYPES.TITLE, 'Classic Pasta'),
      field(UPDATE_TYPES.DESCRIPTION, 'A'.repeat(90)),
      field(UPDATE_TYPES.IMAGE, { url: 'https://example.com/a.jpg' }),
      field(UPDATE_TYPES.INGREDIENTS, 'flour\nsalt'),
    ]);
    expect(ratingFor(result, 'identity')).toBe('excellent');
    expect(ratingFor(result, 'media')).toBe('good');
  });

  it('improves discoverability and seo with tags', () => {
    const result = computeSemanticCompleteness('recipe', [
      field(UPDATE_TYPES.NAME, 'Pasta'),
      field(UPDATE_TYPES.DESCRIPTION, 'A'.repeat(90)),
      field(UPDATE_TYPES.IMAGE, { url: 'https://example.com/a.jpg' }),
      field(UPDATE_TYPES.TAG_CATEGORY, 'Cuisine'),
      field(UPDATE_TYPES.TAG_CATEGORY_ITEM, {
        category: 'Cuisine',
        value: 'Italian',
      }),
    ]);
    expect(ratingFor(result, 'discoverability')).not.toBe('missing');
    expect(ratingFor(result, 'seo')).not.toBe('missing');
  });
});
