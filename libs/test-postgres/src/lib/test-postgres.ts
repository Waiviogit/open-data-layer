import { Kysely, PostgresDialect } from 'kysely';
import type { OdlDatabase } from '@opden-data-layer/odl-db-types';
import { Pool } from 'pg';

export const DEFAULT_TEST_POSTGRES_URL =
  'postgres://test:test@127.0.0.1:55432/test';

const ROLLBACK_SENTINEL = Symbol('test-postgres-rollback');

export function resolveTestPostgresUrl(): string {
  return process.env['POSTGRES_TEST_URL']?.trim() || DEFAULT_TEST_POSTGRES_URL;
}

export function assertTestDatabase(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid Postgres URL: ${url}`);
  }

  const database = parsed.pathname.replace(/^\//, '');
  if (database !== 'test') {
    throw new Error(
      `Refusing to connect to non-test database "${database}" — expected exactly "test"`,
    );
  }
}

export async function waitForTestPostgres(timeoutMs = 60_000): Promise<void> {
  const url = resolveTestPostgresUrl();
  assertTestDatabase(url);
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const pool = new Pool({ connectionString: url });
    try {
      await pool.query('SELECT 1');
      await pool.end();
      return;
    } catch {
      await pool.end().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error(`Test Postgres not ready after ${timeoutMs}ms (${url})`);
}

export function createTestDb(): Kysely<OdlDatabase> {
  const url = resolveTestPostgresUrl();
  assertTestDatabase(url);
  return new Kysely<OdlDatabase>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString: url }),
    }),
  });
}

export async function withRollback<T>(
  db: Kysely<OdlDatabase>,
  fn: (trx: Kysely<OdlDatabase>) => Promise<T>,
): Promise<T> {
  let result: T | undefined;
  try {
    await db.transaction().execute(async (trx) => {
      result = await fn(trx);
      throw ROLLBACK_SENTINEL;
    });
  } catch (error) {
    if (error !== ROLLBACK_SENTINEL) {
      throw error;
    }
  }
  return result as T;
}
