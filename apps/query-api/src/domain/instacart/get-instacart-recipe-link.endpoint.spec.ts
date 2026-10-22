import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DEFAULT_GOVERNANCE_SNAPSHOT } from '@opden-data-layer/objects-domain';
import { GetInstacartRecipeLinkEndpoint } from './get-instacart-recipe-link.endpoint';

function makeEndpoint(projected: Record<string, unknown> | null) {
  const createRecipe = jest.fn();
  const promptWithJsonSchema = jest.fn();
  const redisSet = jest.fn();
  const redisGet = jest.fn().mockResolvedValue(null);
  const endpoint = new GetInstacartRecipeLinkEndpoint(
    {
      loadByObjectIds: jest.fn().mockResolvedValue({
        objects: projected ? [{ object_id: 'obj-1' }] : [],
        voterWaivPowers: {},
        rankVoteProjection: {},
      }),
    } as never,
    {
      resolve: jest.fn().mockReturnValue(projected ? [{ object_id: 'obj-1' }] : []),
    } as never,
    {
      resolveMergedForObjectView: jest.fn().mockResolvedValue(DEFAULT_GOVERNANCE_SNAPSHOT),
    } as never,
    {
      project: jest.fn().mockResolvedValue(projected),
    } as never,
    {
      getGovernanceConfigs: jest.fn().mockResolvedValue([]),
    } as never,
    { promptWithJsonSchema } as never,
    { createRecipe } as never,
    { getClient: () => ({ get: redisGet, set: redisSet }) } as never,
    { get: () => undefined } as never,
  );
  return { endpoint, createRecipe, promptWithJsonSchema, redisSet };
}

describe('GetInstacartRecipeLinkEndpoint', () => {
  it('returns 404 when the object is missing', async () => {
    const { endpoint, createRecipe, promptWithJsonSchema, redisSet } = makeEndpoint(null);
    await expect(
      endpoint.execute({
        objectId: 'missing',
        locale: 'en-US',
        countryCode: null,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(createRecipe).not.toHaveBeenCalled();
    expect(promptWithJsonSchema).not.toHaveBeenCalled();
    expect(redisSet).not.toHaveBeenCalled();
  });

  it('returns 422 when the object is not a recipe', async () => {
    const { endpoint, createRecipe, promptWithJsonSchema, redisSet } = makeEndpoint({
      object_id: 'prod-1',
      object_type: 'product',
      fields: { identifier: [{ type: 'instacart' }] },
    });
    await expect(
      endpoint.execute({
        objectId: 'prod-1',
        locale: 'en-US',
        countryCode: null,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(createRecipe).not.toHaveBeenCalled();
    expect(promptWithJsonSchema).not.toHaveBeenCalled();
    expect(redisSet).not.toHaveBeenCalled();
  });

  it('returns 422 when a recipe has no instacart identifier', async () => {
    const { endpoint, createRecipe, promptWithJsonSchema, redisSet } = makeEndpoint({
      object_id: 'recipe-1',
      object_type: 'recipe',
      fields: { identifier: [{ type: 'asin', value: 'B001' }] },
    });
    await expect(
      endpoint.execute({
        objectId: 'recipe-1',
        locale: 'en-US',
        countryCode: null,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(createRecipe).not.toHaveBeenCalled();
    expect(promptWithJsonSchema).not.toHaveBeenCalled();
    expect(redisSet).not.toHaveBeenCalled();
  });

  it('allows a case-insensitive Instacart identifier', async () => {
    const { endpoint } = makeEndpoint({
      object_id: 'recipe-1',
      object_type: 'recipe',
      fields: { name: 'Soup', identifier: [{ type: 'Instacart' }] },
    });
    const result = await endpoint.execute({
      objectId: 'recipe-1',
      locale: 'en-US',
      countryCode: null,
    });
    expect(result.url).toMatch(/^https:\/\/www\.instacart\.com\/?$/);
  });
});
