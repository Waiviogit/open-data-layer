import { UPDATE_ARRAY_MAX } from '../string-limits';
import { UPDATE_AFFILIATE_CODE } from './affiliate-code';

describe('UPDATE_AFFILIATE_CODE', () => {
  it('accepts PERSONAL scope with one code', () => {
    const result = UPDATE_AFFILIATE_CODE.schema.safeParse(['PERSONAL', 'CODE']);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(['PERSONAL', 'CODE']);
    }
  });

  it('accepts GOVERNANCE scope with weighted codes', () => {
    const result = UPDATE_AFFILIATE_CODE.schema.safeParse([
      'GOVERNANCE',
      'A::70',
      'B::30',
    ]);
    expect(result.success).toBe(true);
  });

  it('rejects a legacy domain as the first element', () => {
    const result = UPDATE_AFFILIATE_CODE.schema.safeParse([
      'example.social.gifts',
      'CODE',
    ]);
    expect(result.success).toBe(false);
  });

  it('rejects a scope-only array', () => {
    expect(UPDATE_AFFILIATE_CODE.schema.safeParse(['PERSONAL']).success).toBe(
      false,
    );
  });

  it('rejects an empty array', () => {
    expect(UPDATE_AFFILIATE_CODE.schema.safeParse([]).success).toBe(false);
  });

  it('enforces the max array length', () => {
    const codes = Array.from(
      { length: UPDATE_ARRAY_MAX.AFFILIATE_CODE - 1 },
      (_, i) => `C${i}`,
    );
    const atMax = ['GOVERNANCE', ...codes];
    const overMax = [...atMax, 'EXTRA'];
    expect(atMax).toHaveLength(UPDATE_ARRAY_MAX.AFFILIATE_CODE);
    expect(UPDATE_AFFILIATE_CODE.schema.safeParse(atMax).success).toBe(true);
    expect(UPDATE_AFFILIATE_CODE.schema.safeParse(overMax).success).toBe(false);
  });
});
