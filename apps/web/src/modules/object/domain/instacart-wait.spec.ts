import { instacartWaitPath, loadInstacartRecipeLink } from './instacart-wait';

describe('instacartWaitPath', () => {
  it('encodes the object id', () => {
    expect(instacartWaitPath('a/b')).toBe('/instacart/a%2Fb');
  });
});

describe('loadInstacartRecipeLink', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns the url from a successful BFF response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://www.instacart.com/x' }),
    }) as typeof fetch;

    await expect(loadInstacartRecipeLink('recipe-1')).resolves.toBe(
      'https://www.instacart.com/x',
    );
  });

  it('rejects when the BFF omits url', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as typeof fetch;

    await expect(loadInstacartRecipeLink('recipe-1')).rejects.toThrow('missing url');
  });
});
