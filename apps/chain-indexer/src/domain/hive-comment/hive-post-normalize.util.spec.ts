import type { NewPost } from '@opden-data-layer/core';
import {
  normalizeHiveBeneficiariesForStorage,
  normalizeHiveJsonMetadataForStorage,
  sanitizePostRowJsonColumnsForDatabase,
} from './hive-post-normalize.util';

describe('normalizeHiveJsonMetadataForStorage', () => {
  it('returns {} for empty or null', () => {
    expect(normalizeHiveJsonMetadataForStorage(undefined)).toBe('{}');
    expect(normalizeHiveJsonMetadataForStorage(null)).toBe('{}');
    expect(normalizeHiveJsonMetadataForStorage('')).toBe('{}');
    expect(normalizeHiveJsonMetadataForStorage('  ')).toBe('{}');
  });

  it('keeps valid JSON strings', () => {
    expect(normalizeHiveJsonMetadataForStorage('{"a":1}')).toBe('{"a":1}');
  });

  it('stringifies objects', () => {
    expect(normalizeHiveJsonMetadataForStorage({ tags: ['x'] })).toBe(
      '{"tags":["x"]}',
    );
  });

  it('wraps invalid JSON text as valid JSON string value', () => {
    const out = normalizeHiveJsonMetadataForStorage('not-json{');
    expect(() => JSON.parse(out)).not.toThrow();
    const p = JSON.parse(out) as { _unparsed?: string };
    expect(p._unparsed).toBe('not-json{');
  });
});

describe('normalizeHiveBeneficiariesForStorage', () => {
  it('returns [] for bad input', () => {
    expect(normalizeHiveBeneficiariesForStorage(undefined)).toEqual([]);
    expect(normalizeHiveBeneficiariesForStorage(null)).toEqual([]);
    expect(normalizeHiveBeneficiariesForStorage(123)).toEqual([]);
    expect(normalizeHiveBeneficiariesForStorage('not json')).toEqual([]);
  });

  it('parses JSON array string', () => {
    expect(
      normalizeHiveBeneficiariesForStorage(
        '[{"account":"a","weight":100}]',
      ),
    ).toEqual([{ account: 'a', weight: 100 }]);
  });

  it('maps array entries and coerces weight', () => {
    expect(
      normalizeHiveBeneficiariesForStorage([
        { account: 'x', weight: '50' },
        { account: '', weight: 1 },
        { foo: 1 },
      ]),
    ).toEqual([{ account: 'x', weight: 50 }]);
  });

  it('accepts tuple-style beneficiary rows from RPC', () => {
    expect(
      normalizeHiveBeneficiariesForStorage([
        ['acc', 100],
        ['b', '200'],
      ]),
    ).toEqual([
      { account: 'acc', weight: 100 },
      { account: 'b', weight: 200 },
    ]);
  });
});

describe('sanitizePostRowJsonColumnsForDatabase', () => {
  it('normalizes json_metadata and beneficiaries on a post row', () => {
    const row = {
      author: 'a',
      permlink: 'p',
      json_metadata: 'not-json',
      beneficiaries: [['x', 1]] as unknown as NewPost['beneficiaries'],
    } as NewPost;
    const out = sanitizePostRowJsonColumnsForDatabase(row);
    expect(() => JSON.parse(out.json_metadata)).not.toThrow();
    expect(out.beneficiaries).toEqual([{ account: 'x', weight: 1 }]);
  });
});
