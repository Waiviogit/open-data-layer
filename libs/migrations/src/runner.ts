import { Kysely, Migrator, PostgresDialect } from 'kysely';
import type { PoolConfig } from 'pg';
import { Pool } from 'pg';
import { OdlMigrationProvider } from './provider';

export type MigrationResultSet = Awaited<
  ReturnType<Migrator['migrateToLatest']>
>;

export type MigrationDbOrConfig =
  | Kysely<unknown>
  | (PoolConfig & { connectionString?: string });

function isKysely(db: MigrationDbOrConfig): db is Kysely<unknown> {
  return typeof (db as Kysely<unknown>).selectFrom === 'function';
}

function createDb(config: PoolConfig): Kysely<unknown> {
  return new Kysely<unknown>({
    dialect: new PostgresDialect({ pool: new Pool(config) }),
  });
}

function createMigrator(db: Kysely<unknown>): Migrator {
  return new Migrator({
    db,
    provider: new OdlMigrationProvider(),
  });
}

/**
 * Runs all pending ODL migrations. Uses Kysely Migrator (locking, kysely_migration table).
 * Safe to call from multiple processes; migrations run once.
 *
 * @param dbOrConfig - Kysely instance or pg Pool config (e.g. { connectionString })
 * @returns MigrationResultSet with results and optional error
 */
export async function migrateToLatest(
  dbOrConfig: MigrationDbOrConfig
): Promise<MigrationResultSet> {
  const owned = !isKysely(dbOrConfig);
  const db = owned ? createDb(dbOrConfig) : (dbOrConfig as Kysely<unknown>);
  try {
    const migrator = createMigrator(db);
    const result = await migrator.migrateToLatest();
    return result;
  } finally {
    if (owned) {
      await db.destroy();
    }
  }
}

/**
 * Rolls back the last executed migration.
 *
 * @param dbOrConfig - Kysely instance or pg Pool config
 * @returns MigrationResultSet
 */
export async function migrateDown(
  dbOrConfig: MigrationDbOrConfig
): Promise<MigrationResultSet> {
  const owned = !isKysely(dbOrConfig);
  const db = owned ? createDb(dbOrConfig) : (dbOrConfig as Kysely<unknown>);
  try {
    const migrator = createMigrator(db);
    return await migrator.migrateDown();
  } finally {
    if (owned) {
      await db.destroy();
    }
  }
}

/**
 * Migrates up or down to the named migration (inclusive).
 *
 * @param dbOrConfig - Kysely instance or pg Pool config
 * @param targetName - Migration name (e.g. '00001_odl_schema')
 * @returns MigrationResultSet
 */
export async function migrateTo(
  dbOrConfig: MigrationDbOrConfig,
  targetName: string
): Promise<MigrationResultSet> {
  const owned = !isKysely(dbOrConfig);
  const db = owned ? createDb(dbOrConfig) : (dbOrConfig as Kysely<unknown>);
  try {
    const migrator = createMigrator(db);
    return await migrator.migrateTo(targetName);
  } finally {
    if (owned) {
      await db.destroy();
    }
  }
}

export interface MigrationStatusItem {
  name: string;
  executedAt: Date | undefined;
}

/**
 * Returns status for all migrations (executed and pending).
 *
 * @param dbOrConfig - Kysely instance or pg Pool config
 * @returns List of { name, executedAt } (executedAt is undefined if pending)
 */
export async function getMigrationStatus(
  dbOrConfig: MigrationDbOrConfig
): Promise<MigrationStatusItem[]> {
  const owned = !isKysely(dbOrConfig);
  const db = owned ? createDb(dbOrConfig) : (dbOrConfig as Kysely<unknown>);
  try {
    const migrator = createMigrator(db);
    const list = await migrator.getMigrations();
    return list.map(({ name, executedAt }) => ({
      name,
      executedAt: executedAt ?? undefined,
    }));
  } finally {
    if (owned) {
      await db.destroy();
    }
  }
}
