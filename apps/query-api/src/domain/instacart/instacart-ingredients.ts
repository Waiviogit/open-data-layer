import type { OpenAiJsonSchema } from '../openai';

export type InstacartIngredient = {
  name: string;
  measurements?: { quantity: number; unit: string }[];
};

export type InstacartRecipePayload = {
  title: string;
  link_type: 'recipe';
  ingredients: InstacartIngredient[];
  instructions: string[];
  image_url?: string;
};

export const INSTACART_INGREDIENTS_JSON_SCHEMA: OpenAiJsonSchema = {
  name: 'instacart_ingredients_schema',
  schema: {
    type: 'object',
    properties: {
      ingredients: {
        type: 'array',
        description: 'List of product ingredients.',
        items: {
          type: 'object',
          description: 'A single product ingredient.',
          properties: {
            name: {
              type: 'string',
              description: 'The product name. Instacart uses it as a search term.',
              minLength: 1,
            },
            measurements: {
              type: 'array',
              description:
                'Measurement units used to specify the ingredient quantity in multiple ways.',
              items: {
                type: 'object',
                properties: {
                  quantity: {
                    type: 'number',
                    description:
                      'The product quantity. Represents item count or measurement based on the unit. Defaults to 1.0. must be gt than 0',
                  },
                  unit: {
                    type: 'string',
                    description:
                      "The unit of measurement. Examples: each, package, tablespoon, teaspoon, ounce, kilogram. Defaults to 'each'.",
                  },
                },
              },
            },
          },
          required: ['name', 'measurements'],
        },
      },
      instructions: {
        type: 'array',
        description: 'preparation instructions',
        minLength: 1,
        items: {
          type: 'string',
          description: 'preparation step',
        },
      },
    },
    required: ['ingredients', 'instructions'],
  },
};

export function readIngredientNames(fields: Record<string, unknown>): string[] {
  const raw = fields.ingredients;
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && item.trim()) {
      out.push(item.trim());
    }
  }
  return out;
}

export function readRecipeImageUrl(fields: Record<string, unknown>): string | undefined {
  for (const key of ['image', 'imageBackground'] as const) {
    const raw = fields[key];
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim();
    }
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const url = (raw as { url?: unknown }).url;
      if (typeof url === 'string' && url.trim()) {
        return url.trim();
      }
    }
  }
  return undefined;
}

export function rawInstacartIngredients(
  names: string[],
  preparation: string,
): { ingredients: InstacartIngredient[]; instructions: string[] } {
  return {
    ingredients: names.map((name) => ({ name })),
    instructions: [preparation],
  };
}

export function buildInstacartIngredientPrompt(input: {
  name: string;
  description: string;
  ingredients: string[];
  preparation: string;
}): string {
  return `Based on recipe description and ingredients format ingredients according to schema;
  name: ${input.name}
  description: ${input.description}
  ingredients: ${JSON.stringify(input.ingredients)}
  if ingredients says this amount or that amount in terms of quantity pick one with bigger quantity
  if description says use this ore that make each as ingredient pick both;
  
  Divide recipe preparation into steps: ${input.preparation}
  `;
}

export function parseLlmRecipeIngredients(
  raw: unknown,
): { ingredients: InstacartIngredient[]; instructions: string[] } | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const rec = raw as Record<string, unknown>;
  if (!Array.isArray(rec.ingredients) || !Array.isArray(rec.instructions)) {
    return null;
  }
  const ingredients: InstacartIngredient[] = [];
  for (const item of rec.ingredients) {
    if (item == null || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const name = (item as { name?: unknown }).name;
    if (typeof name !== 'string' || !name.trim()) {
      continue;
    }
    ingredients.push(item as InstacartIngredient);
  }
  const instructions = rec.instructions.filter(
    (step): step is string => typeof step === 'string' && step.trim().length > 0,
  );
  if (ingredients.length === 0 || instructions.length === 0) {
    return null;
  }
  return { ingredients, instructions };
}

export function buildInstacartRecipePayload(input: {
  title: string;
  ingredients: InstacartIngredient[];
  instructions: string[];
  imageUrl?: string;
}): InstacartRecipePayload {
  return {
    title: input.title,
    link_type: 'recipe',
    ingredients: input.ingredients,
    instructions: input.instructions,
    ...(input.imageUrl ? { image_url: input.imageUrl } : {}),
  };
}
