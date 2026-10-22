import { redisKey } from './redis-keys';

describe('redisKey.affiliateGovernanceCodes', () => {
  it('includes a v2 segment so pre-fix cached empty results are not reused', () => {
    expect(redisKey.affiliateGovernanceCodes('rxt-waiviodev-governance', '')).toBe(
      'query-api:cache:affiliate-codes:governance:v2:rxt-waiviodev-governance:none',
    );
    expect(redisKey.affiliateGovernanceCodes('rxt-waiviodev-governance', '')).not.toBe(
      'query-api:cache:affiliate-codes:governance:rxt-waiviodev-governance:none',
    );
  });
});
