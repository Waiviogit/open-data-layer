import { parseAcceptLanguage } from './parse-accept-language';

describe('parseAcceptLanguage', () => {
  it('returns empty for missing header', () => {
    expect(parseAcceptLanguage(null)).toEqual([]);
    expect(parseAcceptLanguage('')).toEqual([]);
  });

  it('orders by q descending', () => {
    expect(parseAcceptLanguage('en-US;q=0.8, id-ID;q=0.9, *;q=0.1')).toEqual([
      'id-ID',
      'en-US',
      '*',
    ]);
  });

  it('defaults q to 1', () => {
    expect(parseAcceptLanguage('en, de')).toEqual(['en', 'de']);
  });
});
