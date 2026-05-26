import { OBJECT_TYPES } from '@opden-data-layer/core';

import type { ProjectedObject } from '../projected-object.types';
import { buildObjectJsonLd } from './build-object-json-ld';

describe('buildObjectJsonLd', () => {
  const base: ProjectedObject = {
    object_id: 'obj-1',
    object_type: OBJECT_TYPES.PRODUCT,
    semantic_type: null,
    weight: 1,
    fields: {
      name: 'Widget',
      description: 'A useful widget',
      price: '$9.99',
      image: 'https://cdn.example/widget.jpg',
    },
    hasAdministrativeAuthority: false,
    hasOwnershipAuthority: false,
  };

  it('builds Product JSON-LD with offer', () => {
    const json = buildObjectJsonLd(base, 'https://site.com/object/obj-1');
    expect(json['@type']).toBe('Product');
    expect(json.name).toBe('Widget');
    expect(json.offers).toEqual({
      '@type': 'Offer',
      price: '$9.99',
      priceCurrency: 'USD',
    });
  });

  it('builds Recipe JSON-LD with ingredients', () => {
    const json = buildObjectJsonLd(
      {
        ...base,
        object_type: OBJECT_TYPES.RECIPE,
        fields: {
          name: 'Soup',
          ingredients: ['water', 'salt'],
          cookTime: 'PT30M',
        },
      },
      'https://site.com/object/obj-1',
    );
    expect(json['@type']).toBe('Recipe');
    expect(json.recipeIngredient).toEqual(['water', 'salt']);
  });

  it('falls back to Thing for unknown types', () => {
    const json = buildObjectJsonLd(
      { ...base, object_type: OBJECT_TYPES.WIDGET },
      null,
    );
    expect(json['@type']).toBe('Thing');
  });
});
