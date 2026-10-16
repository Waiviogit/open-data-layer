import { validateQueryApi } from './env.validation';

function parse(overrides: Record<string, unknown> = {}) {
  return validateQueryApi({
    JWT_SECRET: 'test-secret',
    ...overrides,
  });
}

describe('validateQueryApi geoip env', () => {
  it('treats blank GEOIP_DB_PATH as unset', () => {
    expect(parse({ GEOIP_DB_PATH: '' }).GEOIP_DB_PATH).toBeUndefined();
    expect(parse({ GEOIP_DB_PATH: '   ' }).GEOIP_DB_PATH).toBeUndefined();
  });

  it('trims GEOIP_DB_PATH', () => {
    expect(parse({ GEOIP_DB_PATH: '  data/geoip/db.mmdb  ' }).GEOIP_DB_PATH).toBe(
      'data/geoip/db.mmdb',
    );
  });

  it('defaults TRUST_PROXY to 0', () => {
    expect(parse().TRUST_PROXY).toBe(0);
  });

  it('rejects a negative TRUST_PROXY', () => {
    expect(() => parse({ TRUST_PROXY: '-1' })).toThrow(/Config validation error/);
  });
});
