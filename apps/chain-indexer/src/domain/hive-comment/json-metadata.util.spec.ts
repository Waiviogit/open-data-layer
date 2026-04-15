import { parseJsonMetadata } from './json-metadata.util';

describe('json-metadata.util', () => {
  it('returns null for invalid json', () => {
    expect(parseJsonMetadata('{not json')).toBeNull();
  });

  it('returns object for valid object', () => {
    expect(parseJsonMetadata('{"tags":["a"]}')).toEqual({ tags: ['a'] });
  });
});
