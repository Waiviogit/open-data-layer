import {
  assertTestDatabase,
  DEFAULT_TEST_POSTGRES_URL,
} from './test-postgres';

describe('assertTestDatabase', () => {
  it('accepts the default test URL', () => {
    expect(() => assertTestDatabase(DEFAULT_TEST_POSTGRES_URL)).not.toThrow();
  });

  it('throws for non-test database names', () => {
    expect(() =>
      assertTestDatabase('postgres://test:test@127.0.0.1:55432/odl'),
    ).toThrow(/expected exactly "test"/);
  });

  it('throws when database path is missing', () => {
    expect(() =>
      assertTestDatabase('postgres://test:test@127.0.0.1:55432'),
    ).toThrow(/expected exactly "test"/);
  });

  it('throws for test_backup database name', () => {
    expect(() =>
      assertTestDatabase('postgres://test:test@127.0.0.1:55432/test_backup'),
    ).toThrow(/expected exactly "test"/);
  });
});
