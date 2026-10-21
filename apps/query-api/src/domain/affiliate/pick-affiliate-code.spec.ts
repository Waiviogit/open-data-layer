import { pickAffiliateCode } from './pick-affiliate-code';

describe('pickAffiliateCode', () => {
  afterEach(() => {
    jest.spyOn(Math, 'random').mockRestore();
  });

  it('returns the single remaining code unchanged', () => {
    expect(pickAffiliateCode(['AMAZON-1'])).toBe('AMAZON-1');
  });

  it('strips the chance suffix from a single weighted code', () => {
    expect(pickAffiliateCode(['AMAZON::100'])).toBe('AMAZON');
  });

  it('rejects a single code with an invalid chance', () => {
    expect(pickAffiliateCode(['AMAZON::x'])).toBe('');
  });

  it('rejects a single code with a negative chance', () => {
    expect(pickAffiliateCode(['AMAZON::-1'])).toBe('');
  });

  it('returns empty string when any chance is invalid', () => {
    expect(pickAffiliateCode(['A::70', 'B::x'])).toBe('');
  });

  it('returns empty string when chance sum is zero', () => {
    expect(pickAffiliateCode(['A::0', 'B::0'])).toBe('');
  });

  it('picks the first weighted code when random is below the first cumulative', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    expect(pickAffiliateCode(['A::70', 'B::30'])).toBe('A');
  });

  it('picks the second weighted code when random lands on the 70 boundary', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.7);
    expect(pickAffiliateCode(['A::70', 'B::30'])).toBe('B');
  });

  it('returns empty for empty or non-array codes', () => {
    expect(pickAffiliateCode([])).toBe('');
    expect(pickAffiliateCode(null as unknown as string[])).toBe('');
  });

  it('returns empty for a negative chance', () => {
    expect(pickAffiliateCode(['A::70', 'B::-1'])).toBe('');
  });

  it('rejects a negative chance even if others are valid', () => {
    expect(pickAffiliateCode(['A::100', 'B::-0.1'])).toBe('');
  });
});
