import { UPDATE_AFFILIATE_URL_TEMPLATE } from './affiliate-url-template';

const AMAZON_TEMPLATE =
  'https://www.amazon.fr/dp/$productId/ref=nosim?tag=$affiliateCode';

describe('UPDATE_AFFILIATE_URL_TEMPLATE', () => {
  it('accepts an Amazon camelCase template', () => {
    const result = UPDATE_AFFILIATE_URL_TEMPLATE.schema.safeParse(AMAZON_TEMPLATE);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(AMAZON_TEMPLATE);
    }
  });

  it('rejects a snake-only template', () => {
    expect(
      UPDATE_AFFILIATE_URL_TEMPLATE.schema.safeParse(
        'https://a/$product_id?t=$affiliate_code',
      ).success,
    ).toBe(false);
  });

  it('rejects an empty template', () => {
    expect(UPDATE_AFFILIATE_URL_TEMPLATE.schema.safeParse('').success).toBe(false);
  });

  it('rejects a template missing $productId', () => {
    expect(
      UPDATE_AFFILIATE_URL_TEMPLATE.schema.safeParse(
        'https://a.com?tag=$affiliateCode',
      ).success,
    ).toBe(false);
  });

  it('rejects a template missing $affiliateCode', () => {
    expect(
      UPDATE_AFFILIATE_URL_TEMPLATE.schema.safeParse(
        'https://a.com/dp/$productId',
      ).success,
    ).toBe(false);
  });

  it('rejects an http template even with camel tokens', () => {
    expect(
      UPDATE_AFFILIATE_URL_TEMPLATE.schema.safeParse(
        'http://a.com/$productId?t=$affiliateCode',
      ).success,
    ).toBe(false);
  });

  it('rejects a non-URL string even with camel tokens', () => {
    expect(
      UPDATE_AFFILIATE_URL_TEMPLATE.schema.safeParse('foo$productId$affiliateCode')
        .success,
    ).toBe(false);
  });

  it('accepts an uppercase HTTPS scheme', () => {
    expect(
      UPDATE_AFFILIATE_URL_TEMPLATE.schema.safeParse(
        'HTTPS://a.com/$productId?t=$affiliateCode',
      ).success,
    ).toBe(true);
  });

  it('rejects wrong-case tokens', () => {
    expect(
      UPDATE_AFFILIATE_URL_TEMPLATE.schema.safeParse(
        'https://a.com/$productid?t=$affiliatecode',
      ).success,
    ).toBe(false);
  });
});
