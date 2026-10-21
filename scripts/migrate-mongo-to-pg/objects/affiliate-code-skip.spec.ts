import { shouldSkipLegacyAffiliateCode } from './affiliate-code-skip';

describe('shouldSkipLegacyAffiliateCode', () => {
  it('keeps a PERSONAL body', () => {
    expect(shouldSkipLegacyAffiliateCode('["PERSONAL","CODE1"]')).toBe(false);
  });

  it('keeps a GOVERNANCE body', () => {
    expect(shouldSkipLegacyAffiliateCode('["GOVERNANCE","SITE"]')).toBe(false);
  });

  it('skips a domain-scoped body', () => {
    expect(shouldSkipLegacyAffiliateCode('["example.social.gifts","CODE"]')).toBe(
      true,
    );
  });

  it('skips a non-array JSON object', () => {
    expect(shouldSkipLegacyAffiliateCode('{"host":"x"}')).toBe(true);
  });

  it('skips empty and invalid JSON', () => {
    expect(shouldSkipLegacyAffiliateCode('')).toBe(true);
    expect(shouldSkipLegacyAffiliateCode('not-json')).toBe(true);
  });
});
