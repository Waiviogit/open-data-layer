import { buildObjectId, generateObjectId, generatePrefix } from './generate-object-id';

describe('generatePrefix', () => {
  it('returns 3 lowercase letters', () => {
    const prefix = generatePrefix();
    expect(prefix).toMatch(/^[a-z]{3}$/);
  });

  it('generates different prefixes across calls', () => {
    const ids = new Set(Array.from({ length: 20 }, () => generatePrefix()));
    expect(ids.size).toBeGreaterThan(1);
  });
});

describe('buildObjectId', () => {
  it('combines prefix and slugified name', () => {
    expect(buildObjectId('kjc', 'My Object')).toBe('kjc-my-object');
  });

  it('returns prefix only when name is empty', () => {
    expect(buildObjectId('kjc', '')).toBe('kjc');
    expect(buildObjectId('kjc', '   ')).toBe('kjc');
  });
});

describe('generateObjectId', () => {
  it('returns 3 lowercase letters (alias of generatePrefix)', () => {
    const id = generateObjectId();
    expect(id).toMatch(/^[a-z]{3}$/);
  });
});
