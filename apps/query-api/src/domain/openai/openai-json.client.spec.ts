import { OpenAiJsonClient } from './openai-json.client';

describe('OpenAiJsonClient', () => {
  it('returns an error object when the API key is missing and does not throw', async () => {
    const client = new OpenAiJsonClient({
      get: () => undefined,
    } as never);
    const result = await client.promptWithJsonSchema({
      prompt: 'format this',
      jsonSchema: { name: 't', schema: { type: 'object' } },
    });
    expect(result.error).toBe('OPENAI_API_KEY is not configured');
    expect(result.result).toBeUndefined();
  });
});
