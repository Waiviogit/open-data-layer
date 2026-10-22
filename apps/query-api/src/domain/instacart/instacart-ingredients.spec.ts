import {
  parseLlmRecipeIngredients,
  parseServingsCount,
  resolveInstacartServings,
} from './instacart-ingredients';

describe('parseServingsCount', () => {
  it('reads a positive integer string', () => {
    expect(parseServingsCount('4')).toBe(4);
  });

  it('takes the first number from a range', () => {
    expect(parseServingsCount('4-6')).toBe(4);
  });

  it('reads a number embedded in text', () => {
    expect(parseServingsCount('serves 8 people')).toBe(8);
  });

  it('rejects zero and non-numeric text', () => {
    expect(parseServingsCount('0')).toBeNull();
    expect(parseServingsCount('none')).toBeNull();
    expect(parseServingsCount('')).toBeNull();
  });
});

describe('resolveInstacartServings', () => {
  it('prefers the object field, then OpenAI, then 1', () => {
    expect(resolveInstacartServings('4', 8)).toBe(4);
    expect(resolveInstacartServings(undefined, 8)).toBe(8);
    expect(resolveInstacartServings(undefined, null)).toBe(1);
  });
});

describe('parseLlmRecipeIngredients', () => {
  it('reads optional servings from the LLM object', () => {
    const parsed = parseLlmRecipeIngredients({
      ingredients: [{ name: 'salt' }],
      instructions: ['Mix'],
      servings: 3,
    });
    expect(parsed?.servings).toBe(3);
  });

  it('returns null servings when the LLM omits them', () => {
    const parsed = parseLlmRecipeIngredients({
      ingredients: [{ name: 'salt' }],
      instructions: ['Mix'],
    });
    expect(parsed?.servings).toBeNull();
  });
});
