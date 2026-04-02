import { fail, isFail, isOk, ok, type Result } from './result';

describe('Result', () => {
  it('ok wraps value', () => {
    const r: Result<number, string> = ok(42);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value).toBe(42);
    }
  });

  it('fail wraps error', () => {
    const r: Result<number, string> = fail('oops');
    expect(isFail(r)).toBe(true);
    if (isFail(r)) {
      expect(r.error).toBe('oops');
    }
  });
});
