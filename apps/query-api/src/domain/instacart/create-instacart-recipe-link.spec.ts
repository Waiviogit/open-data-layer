import { INSTACART_RECIPE_LINK_CACHE_TTL_SEC } from '../../constants/cache.constants';
import {
  createInstacartRecipeLink,
  InstacartLinkRejectedError,
  type InstacartRecipeLinkDeps,
  type InstacartRecipeObject,
} from './create-instacart-recipe-link';
import type { InstacartRecipePayload } from './instacart-ingredients';

const RECIPE: InstacartRecipeObject = {
  object_id: 'recipe-1',
  object_type: 'recipe',
  fields: {
    name: 'Pancakes',
    description: 'Mix well',
    ingredients: ['flour', 'eggs'],
  },
};

function makeDeps(
  overrides: Partial<
    Omit<InstacartRecipeLinkDeps, 'cacheGet' | 'cacheSet' | 'openai' | 'createRecipe'>
  > = {},
) {
  const cacheGet = jest.fn().mockResolvedValue(null);
  const cacheSet = jest.fn().mockResolvedValue(undefined);
  const openai = {
    promptWithJsonSchema: jest.fn().mockResolvedValue({ error: 'unused' }),
  };
  const createRecipe = jest
    .fn()
    .mockResolvedValue({ url: 'https://www.instacart.com/r/1' });
  return {
    instacartKey: undefined,
    openaiKey: undefined,
    countryCode: null,
    affiliateCode: null,
    fallbackOrigin: 'https://example.com',
    cacheGet,
    cacheSet,
    openai,
    createRecipe,
    ...overrides,
  };
}

function urlOf(result: { url: string }): URL {
  return new URL(result.url);
}

describe('createInstacartRecipeLink', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the US storefront when INSTACART_KEY is empty and does not call adapters', async () => {
    const deps = makeDeps();
    const result = await createInstacartRecipeLink(RECIPE, deps);
    expect(result.url).toMatch(/^https:\/\/www\.instacart\.com\/?$/);
    expect(deps.createRecipe).not.toHaveBeenCalled();
    expect(deps.openai.promptWithJsonSchema).not.toHaveBeenCalled();
    expect(deps.cacheSet).not.toHaveBeenCalled();
    expect(deps.cacheGet).not.toHaveBeenCalled();
  });

  it('uses .ca for Canada when INSTACART_KEY is empty', async () => {
    const deps = makeDeps({ countryCode: 'CA' });
    const result = await createInstacartRecipeLink(RECIPE, deps);
    expect(urlOf(result).hostname).toBe('www.instacart.ca');
    expect(deps.createRecipe).not.toHaveBeenCalled();
    expect(deps.openai.promptWithJsonSchema).not.toHaveBeenCalled();
    expect(deps.cacheSet).not.toHaveBeenCalled();
  });

  it('appends UTM when an instacart affiliate code exists', async () => {
    jest.spyOn(crypto, 'randomUUID').mockReturnValue(
      '11111111-2222-4333-8444-555555555555' as `${string}-${string}-${string}-${string}-${string}`,
    );
    const deps = makeDeps({ affiliateCode: 'abc123' });
    const result = await createInstacartRecipeLink(RECIPE, deps);
    const parsed = urlOf(result);
    expect(parsed.searchParams.get('utm_campaign')).toBe('instacart-idp');
    expect(parsed.searchParams.get('utm_medium')).toBe('affiliate');
    expect(parsed.searchParams.get('utm_source')).toBe('instacart_idp');
    expect(parsed.searchParams.get('utm_term')).toBe('partnertype-mediapartner');
    expect(parsed.searchParams.get('utm_content')).toContain('partnerid-abc123');
    expect(parsed.searchParams.get('subId2')).toBe('examplecom');
    expect(parsed.searchParams.get('subId1')).toBeTruthy();
  });

  it('omits UTM when no partner code exists', async () => {
    const result = await createInstacartRecipeLink(RECIPE, makeDeps());
    expect(urlOf(result).searchParams.get('utm_campaign')).toBeNull();
  });

  it('does not require ingredients on the no-key path', async () => {
    const deps = makeDeps();
    const result = await createInstacartRecipeLink(
      { ...RECIPE, fields: { name: 'Empty', identifier: [{ type: 'instacart' }] } },
      deps,
    );
    expect(result.url).toMatch(/^https:\/\/www\.instacart\.com\/?$/);
    expect(deps.createRecipe).not.toHaveBeenCalled();
    expect(deps.cacheSet).not.toHaveBeenCalled();
  });

  it('posts raw ingredients when Instacart key is set and OpenAI key is empty', async () => {
    const deps = makeDeps({ instacartKey: 'ik' });
    await createInstacartRecipeLink(RECIPE, deps);
    expect(deps.openai.promptWithJsonSchema).not.toHaveBeenCalled();
    expect(deps.createRecipe).toHaveBeenCalledTimes(1);
    const payload = deps.createRecipe.mock.calls[0][0] as InstacartRecipePayload;
    expect(payload).toMatchObject({
      title: 'Pancakes',
      link_type: 'recipe',
      ingredients: [{ name: 'flour' }, { name: 'eggs' }],
      instructions: ['Mix well'],
      servings: 1,
    });
    expect(deps.cacheSet).toHaveBeenCalledWith(
      'recipe-1',
      'https://www.instacart.com/r/1',
      INSTACART_RECIPE_LINK_CACHE_TTL_SEC,
    );
  });

  it('sends OpenAI-formatted ingredients to IDP when both keys are set', async () => {
    const deps = makeDeps({
      instacartKey: 'ik',
      openaiKey: 'ok',
    });
    deps.openai.promptWithJsonSchema.mockResolvedValue({
      result: {
        ingredients: [{ name: 'flour', measurements: [{ quantity: 2, unit: 'cup' }] }],
        instructions: ['Step 1'],
        servings: 8,
      },
    });
    await createInstacartRecipeLink(RECIPE, deps);
    expect(deps.openai.promptWithJsonSchema).toHaveBeenCalledTimes(1);
    expect(deps.createRecipe).toHaveBeenCalledTimes(1);
    expect(deps.createRecipe.mock.calls[0][0]).toMatchObject({
      ingredients: [{ name: 'flour', measurements: [{ quantity: 2, unit: 'cup' }] }],
      instructions: ['Step 1'],
      servings: 8,
    });
    expect(deps.cacheSet).toHaveBeenCalled();
  });

  it('uses object servings over OpenAI when the field is present', async () => {
    const deps = makeDeps({
      instacartKey: 'ik',
      openaiKey: 'ok',
    });
    deps.openai.promptWithJsonSchema.mockResolvedValue({
      result: {
        ingredients: [{ name: 'flour' }],
        instructions: ['Mix'],
        servings: 8,
      },
    });
    await createInstacartRecipeLink(
      { ...RECIPE, fields: { ...RECIPE.fields, servings: '4-6' } },
      deps,
    );
    expect(deps.createRecipe.mock.calls[0][0]).toMatchObject({ servings: 4 });
  });

  it('defaults servings to 1 when the field and OpenAI omit them', async () => {
    const deps = makeDeps({ instacartKey: 'ik' });
    await createInstacartRecipeLink(RECIPE, deps);
    expect(deps.createRecipe.mock.calls[0][0]).toMatchObject({ servings: 1 });
  });

  it('reapplies CA and UTM on a cache hit and skips OpenAI and IDP', async () => {
    const deps = makeDeps({
      instacartKey: 'ik',
      openaiKey: 'ok',
      countryCode: 'CA',
      affiliateCode: 'abc123',
    });
    deps.cacheGet.mockResolvedValue('https://www.instacart.com/store/recipe/abc?old=1');
    const result = await createInstacartRecipeLink(RECIPE, deps);
    const parsed = urlOf(result);
    expect(parsed.hostname).toBe('www.instacart.ca');
    expect(parsed.pathname).toBe('/store/recipe/abc');
    expect(parsed.searchParams.get('old')).toBeNull();
    expect(parsed.searchParams.get('utm_content')).toContain('partnerid-abc123');
    expect(deps.openai.promptWithJsonSchema).not.toHaveBeenCalled();
    expect(deps.createRecipe).not.toHaveBeenCalled();
    expect(deps.cacheSet).not.toHaveBeenCalled();
  });

  it('falls back to the storefront when IDP fails and does not cache', async () => {
    const deps = makeDeps({ instacartKey: 'ik' });
    deps.createRecipe.mockResolvedValue({ error: 'IDP down' });
    const result = await createInstacartRecipeLink(RECIPE, deps);
    expect(result.url).toMatch(/^https:\/\/www\.instacart\.com\/?$/);
    expect(deps.cacheSet).not.toHaveBeenCalled();
  });

  it('stores the cached URL without query params', async () => {
    const deps = makeDeps({ instacartKey: 'ik' });
    deps.createRecipe.mockResolvedValue({
      url: 'https://www.instacart.com/r/1?utm=x',
    });
    await createInstacartRecipeLink(RECIPE, deps);
    expect(deps.cacheSet).toHaveBeenCalledWith(
      'recipe-1',
      'https://www.instacart.com/r/1',
      2_592_000,
    );
  });

  it('rejects empty ingredients when INSTACART_KEY is set', async () => {
    const deps = makeDeps({ instacartKey: 'ik' });
    await expect(
      createInstacartRecipeLink(
        { ...RECIPE, fields: { name: 'Empty', ingredients: [] } },
        deps,
      ),
    ).rejects.toBeInstanceOf(InstacartLinkRejectedError);
    expect(deps.createRecipe).not.toHaveBeenCalled();
    expect(deps.cacheSet).not.toHaveBeenCalled();
  });

  it('falls back to raw ingredients when OpenAI returns an error object', async () => {
    const deps = makeDeps({
      instacartKey: 'ik',
      openaiKey: 'ok',
    });
    deps.openai.promptWithJsonSchema.mockResolvedValue({ error: 'bad json' });
    await createInstacartRecipeLink(
      {
        ...RECIPE,
        fields: { name: 'Soup', description: 'Boil', ingredients: ['salt'] },
      },
      deps,
    );
    expect(deps.createRecipe.mock.calls[0][0]).toMatchObject({
      ingredients: [{ name: 'salt' }],
      instructions: ['Boil'],
    });
  });

  it('falls back to raw ingredients when OpenAI times out', async () => {
    const deps = makeDeps({
      instacartKey: 'ik',
      openaiKey: 'ok',
    });
    deps.openai.promptWithJsonSchema.mockResolvedValue({ error: 'timeout' });
    await createInstacartRecipeLink(
      {
        ...RECIPE,
        fields: { name: 'Soup', description: 'Boil', ingredients: ['salt'] },
      },
      deps,
    );
    expect(deps.createRecipe.mock.calls[0][0]).toMatchObject({
      ingredients: [{ name: 'salt' }],
      instructions: ['Boil'],
    });
  });
});
