import { objectHasInstacartRecipeButton } from './instacart-recipe-button';

describe('objectHasInstacartRecipeButton', () => {
  it('is true for a recipe with an instacart identifier', () => {
    expect(
      objectHasInstacartRecipeButton({
        object_type: 'recipe',
        fields: { identifier: [{ type: 'instacart' }] },
      }),
    ).toBe(true);
  });

  it('matches identifier type case-insensitively', () => {
    expect(
      objectHasInstacartRecipeButton({
        object_type: 'recipe',
        fields: { identifier: [{ type: 'Instacart' }] },
      }),
    ).toBe(true);
  });

  it('is false on a product even with an instacart identifier', () => {
    expect(
      objectHasInstacartRecipeButton({
        object_type: 'product',
        fields: { identifier: [{ type: 'instacart' }] },
      }),
    ).toBe(false);
  });

  it('is false on a recipe with only an amazon identifier', () => {
    expect(
      objectHasInstacartRecipeButton({
        object_type: 'recipe',
        fields: { identifier: [{ type: 'amazon', value: 'B001' }] },
      }),
    ).toBe(false);
  });
});
