import { INSTACART_RECIPE_LINK_CACHE_TTL_SEC } from '../../constants/cache.constants';
import type { OpenAiJsonClient } from '../openai';
import {
  buildInstacartIngredientPrompt,
  buildInstacartRecipePayload,
  parseLlmRecipeIngredients,
  rawInstacartIngredients,
  readIngredientNames,
  readRecipeImageUrl,
  type InstacartRecipePayload,
} from './instacart-ingredients';
import { INSTACART_INGREDIENTS_JSON_SCHEMA } from './instacart-ingredients';
import { finalizeInstacartUrl, instacartStorefrontUrl, stripQueryParams } from './instacart-url';

export type InstacartRecipeObject = {
  object_id: string;
  object_type: string;
  fields: Record<string, unknown>;
};

export type InstacartRecipeLinkDeps = {
  instacartKey: string | undefined;
  openaiKey: string | undefined;
  countryCode: string | null;
  affiliateCode: string | null;
  fallbackOrigin: string;
  cacheGet: (objectId: string) => Promise<string | null>;
  cacheSet: (objectId: string, url: string, ttlSec: number) => Promise<void>;
  openai: Pick<OpenAiJsonClient, 'promptWithJsonSchema'>;
  createRecipe: (payload: InstacartRecipePayload) => Promise<{ url: string } | { error: string }>;
};

export class InstacartLinkRejectedError extends Error {
  constructor(
    readonly status: 422,
    message: string,
  ) {
    super(message);
    this.name = 'InstacartLinkRejectedError';
  }
}

export async function createInstacartRecipeLink(
  object: InstacartRecipeObject,
  deps: InstacartRecipeLinkDeps,
): Promise<{ url: string }> {
  const storefront = () =>
    finalizeInstacartUrl({
      baseUrl: instacartStorefrontUrl(deps.countryCode),
      countryCode: deps.countryCode,
      affiliateCode: deps.affiliateCode,
      fallbackOrigin: deps.fallbackOrigin,
    });

  if (!deps.instacartKey) {
    return { url: storefront() };
  }

  const cached = await deps.cacheGet(object.object_id);
  if (cached) {
    return {
      url: finalizeInstacartUrl({
        baseUrl: cached,
        countryCode: deps.countryCode,
        affiliateCode: deps.affiliateCode,
        fallbackOrigin: deps.fallbackOrigin,
      }),
    };
  }

  const names = readIngredientNames(object.fields);
  if (names.length === 0) {
    throw new InstacartLinkRejectedError(422, 'Recipe has no usable ingredients');
  }

  const title =
    (typeof object.fields.name === 'string' && object.fields.name.trim()) || object.object_id;
  const description =
    typeof object.fields.description === 'string' ? object.fields.description.trim() : '';
  const raw = rawInstacartIngredients(names, description);
  let ingredients = raw.ingredients;
  let instructions = raw.instructions;

  if (deps.openaiKey) {
    const llm = await deps.openai.promptWithJsonSchema({
      prompt: buildInstacartIngredientPrompt({
        name: title,
        description,
        ingredients: names,
        preparation: description,
      }),
      jsonSchema: INSTACART_INGREDIENTS_JSON_SCHEMA,
    });
    const parsed = parseLlmRecipeIngredients(llm.result);
    if (parsed) {
      ingredients = parsed.ingredients;
      instructions = parsed.instructions;
    }
  }

  const payload = buildInstacartRecipePayload({
    title,
    ingredients,
    instructions,
    imageUrl: readRecipeImageUrl(object.fields),
  });
  const created = await deps.createRecipe(payload);
  if ('error' in created) {
    return { url: storefront() };
  }

  const bare = stripQueryParams(created.url);
  await deps.cacheSet(object.object_id, bare, INSTACART_RECIPE_LINK_CACHE_TTL_SEC);
  return {
    url: finalizeInstacartUrl({
      baseUrl: bare,
      countryCode: deps.countryCode,
      affiliateCode: deps.affiliateCode,
      fallbackOrigin: deps.fallbackOrigin,
    }),
  };
}
