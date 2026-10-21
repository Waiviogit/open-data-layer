import { AFFILIATE_CODE_SCOPE } from '@opden-data-layer/core/constants';

import {
  addAffiliateCodeEntry,
  AFFILIATE_CODE_CHANCE_TOTAL,
  AFFILIATE_CODE_MAX_ENTRIES,
  applyAffiliateCodeChance,
  initialAffiliateCodeFormValue,
  parseAffiliateCodeFormValue,
  removeAffiliateCodeEntry,
  sanitizeAffiliateCodeFormValue,
} from './affiliate-code-form-value';

describe('affiliate-code-form-value', () => {
  it('initialAffiliateCodeFormValue starts PERSONAL with one empty 100% row', () => {
    expect(initialAffiliateCodeFormValue()).toEqual({
      scope: AFFILIATE_CODE_SCOPE.PERSONAL,
      entries: [{ code: '', chance: AFFILIATE_CODE_CHANCE_TOTAL }],
    });
  });

  it('parseAffiliateCodeFormValue reads CODE and CODE::n arrays', () => {
    expect(parseAffiliateCodeFormValue(['PERSONAL', 'A', 'B'])).toEqual({
      scope: AFFILIATE_CODE_SCOPE.PERSONAL,
      entries: [
        { code: 'A', chance: 50 },
        { code: 'B', chance: 50 },
      ],
    });
    expect(parseAffiliateCodeFormValue(['GOVERNANCE', 'A::70', 'B::30'])).toEqual({
      scope: AFFILIATE_CODE_SCOPE.GOVERNANCE,
      entries: [
        { code: 'A', chance: 70 },
        { code: 'B', chance: 30 },
      ],
    });
  });

  it('parseAffiliateCodeFormValue keeps empty form rows for editing', () => {
    expect(
      parseAffiliateCodeFormValue({
        scope: 'PERSONAL',
        entries: [
          { code: 'A', chance: 70 },
          { code: '', chance: 30 },
        ],
      }),
    ).toEqual({
      scope: AFFILIATE_CODE_SCOPE.PERSONAL,
      entries: [
        { code: 'A', chance: 70 },
        { code: '', chance: 30 },
      ],
    });
  });

  it('sanitizeAffiliateCodeFormValue drops empty codes and writes CODE::n', () => {
    expect(
      sanitizeAffiliateCodeFormValue({
        scope: 'PERSONAL',
        entries: [
          { code: 'A', chance: 86 },
          { code: '  B  ', chance: 14 },
          { code: '', chance: 0 },
        ],
      }),
    ).toEqual(['PERSONAL', 'A::86', 'B::14']);
  });

  it('sanitizeAffiliateCodeFormValue is invalid without a code', () => {
    expect(sanitizeAffiliateCodeFormValue(initialAffiliateCodeFormValue())).toEqual([
      'PERSONAL',
    ]);
  });

  it('sanitizeAffiliateCodeFormValue caps at 19 codes', () => {
    const entries = Array.from({ length: AFFILIATE_CODE_MAX_ENTRIES + 2 }, (_, i) => ({
      code: `C${i}`,
      chance: 1,
    }));
    const sanitized = sanitizeAffiliateCodeFormValue({
      scope: 'GOVERNANCE',
      entries,
    });
    expect(sanitized).toHaveLength(AFFILIATE_CODE_MAX_ENTRIES + 1);
    expect(sanitized[0]).toBe('GOVERNANCE');
    expect(sanitized[1]).toMatch(/^C0::/);
  });

  it('applyAffiliateCodeChance redistributes the remainder to 100', () => {
    const next = applyAffiliateCodeChance(
      [
        { code: 'A', chance: 50 },
        { code: 'B', chance: 50 },
      ],
      0,
      86,
    );
    expect(next[0]).toEqual({ code: 'A', chance: 86 });
    expect(next[1]).toEqual({ code: 'B', chance: 14 });
    expect(next.reduce((sum, row) => sum + row.chance, 0)).toBe(
      AFFILIATE_CODE_CHANCE_TOTAL,
    );
  });

  it('applyAffiliateCodeChance locks a single row at 100', () => {
    expect(applyAffiliateCodeChance([{ code: 'A', chance: 40 }], 0, 10)).toEqual([
      { code: 'A', chance: AFFILIATE_CODE_CHANCE_TOTAL },
    ]);
  });

  it('addAffiliateCodeEntry appends a 0% row and stop at max', () => {
    const two = addAffiliateCodeEntry([{ code: 'A', chance: 100 }]);
    expect(two).toEqual([
      { code: 'A', chance: 100 },
      { code: '', chance: 0 },
    ]);
    const atMax = Array.from({ length: AFFILIATE_CODE_MAX_ENTRIES }, (_, i) => ({
      code: `C${i}`,
      chance: 0,
    }));
    expect(addAffiliateCodeEntry(atMax)).toHaveLength(AFFILIATE_CODE_MAX_ENTRIES);
  });

  it('removeAffiliateCodeEntry renormalizes remaining chances', () => {
    const next = removeAffiliateCodeEntry(
      [
        { code: 'A', chance: 70 },
        { code: 'B', chance: 30 },
      ],
      1,
    );
    expect(next).toEqual([{ code: 'A', chance: AFFILIATE_CODE_CHANCE_TOTAL }]);
  });
});
