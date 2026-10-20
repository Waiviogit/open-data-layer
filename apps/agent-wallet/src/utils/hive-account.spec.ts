import { isValidHiveAccountName, normalizeHiveAccount } from './hive-account';

describe('isValidHiveAccountName', () => {
  it('rejects a short second segment', () => {
    expect(isValidHiveAccountName('a.bc')).toBe(false);
  });

  it('rejects a trailing hyphen', () => {
    expect(isValidHiveAccountName('abc-')).toBe(false);
  });

  it('still accepts a minimum legal name', () => {
    expect(isValidHiveAccountName('abc')).toBe(true);
  });

  it('accepts @Abc after normalize', () => {
    expect(normalizeHiveAccount('@Abc')).toBe('abc');
    expect(isValidHiveAccountName('@Abc')).toBe(true);
  });
});
