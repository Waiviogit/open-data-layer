import {
  buildHiveJsonMetadata,
  buildHiveJsonMetadataString,
  stringifyHiveJsonMetadata,
} from './hive-json-metadata';

describe('buildHiveJsonMetadata', () => {
  it('fills defaults for format, time, and array fields', () => {
    const fixedTime = 1_775_818_918_902;
    const meta = buildHiveJsonMetadata({
      host: 'waivio.com',
      community: 'waivio',
      app: 'waivio/1.0.0',
      timeOfPostCreation: fixedTime,
      tags: ['waivio'],
    });
    expect(meta).toEqual({
      host: 'waivio.com',
      community: 'waivio',
      app: 'waivio/1.0.0',
      format: 'markdown',
      timeOfPostCreation: fixedTime,
      tags: ['waivio'],
      users: [],
      links: [],
      image: [],
    });
  });
});

describe('stringifyHiveJsonMetadata', () => {
  it('produces compact JSON for chain', () => {
    const meta = buildHiveJsonMetadata({
      host: 'waivio.com',
      community: 'waivio',
      app: 'waivio/1.0.0',
      timeOfPostCreation: 1_775_818_918_902,
      tags: ['waivio'],
    });
    expect(stringifyHiveJsonMetadata(meta)).toBe(
      '{"host":"waivio.com","community":"waivio","app":"waivio/1.0.0","format":"markdown","timeOfPostCreation":1775818918902,"tags":["waivio"],"users":[],"links":[],"image":[]}',
    );
  });
});

describe('buildHiveJsonMetadataString', () => {
  it('combines build and stringify', () => {
    const s = buildHiveJsonMetadataString({
      host: 'x.com',
      community: 'c',
      app: 'a/1',
      timeOfPostCreation: 42,
    });
    expect(s).toContain('"host":"x.com"');
    expect(s).toContain('"timeOfPostCreation":42');
  });
});
