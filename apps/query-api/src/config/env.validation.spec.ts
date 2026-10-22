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

describe('validateQueryApi instacart and openai env', () => {
  it('accepts empty Instacart and OpenAI keys and defaults host and model', () => {
    const env = parse();
    expect(env.INSTACART_KEY).toBeUndefined();
    expect(env.OPENAI_API_KEY).toBeUndefined();
    expect(env.INSTACART_HOST).toBe('connect.dev.instacart.tools');
    expect(env.OPENAI_MODEL).toBe('gpt-5.6-luna');
  });

  it('trims Instacart and OpenAI keys and treats blanks as unset', () => {
    expect(parse({ INSTACART_KEY: '  abc  ' }).INSTACART_KEY).toBe('abc');
    expect(parse({ INSTACART_KEY: '   ' }).INSTACART_KEY).toBeUndefined();
    expect(parse({ OPENAI_API_KEY: '  sk-1  ' }).OPENAI_API_KEY).toBe('sk-1');
    expect(parse({ OPENAI_API_KEY: '' }).OPENAI_API_KEY).toBeUndefined();
  });
});
