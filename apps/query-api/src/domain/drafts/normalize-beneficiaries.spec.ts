import { normalizeBeneficiariesForDb } from './normalize-beneficiaries';

describe('normalizeBeneficiariesForDb', () => {
  it('returns empty array for null', () => {
    expect(normalizeBeneficiariesForDb(null)).toEqual([]);
  });

  it('keeps array of objects', () => {
    const v = [{ account: 'a', weight: 100 }];
    expect(normalizeBeneficiariesForDb(v)).toEqual(v);
  });

  it('parses string elements as JSON objects', () => {
    const v = ['{"account":"waivio","weight":300}'];
    expect(normalizeBeneficiariesForDb(v)).toEqual([
      { account: 'waivio', weight: 300 },
    ]);
  });

  it('parses top-level JSON string', () => {
    const v = '[{"account":"x","weight":1}]';
    expect(normalizeBeneficiariesForDb(v)).toEqual([{ account: 'x', weight: 1 }]);
  });

  it('flattens array-like object with numeric keys and string elements', () => {
    const v = {
      0: '{"account":"waivio","weight":300}',
    };
    expect(normalizeBeneficiariesForDb(v)).toEqual([
      { account: 'waivio', weight: 300 },
    ]);
  });
});
