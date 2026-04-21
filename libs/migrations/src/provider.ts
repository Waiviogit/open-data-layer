import type { Migration, MigrationProvider } from 'kysely';
import { MIGRATIONS } from './postgres/odl';

/**
 * Provides bundled ODL migrations to Kysely Migrator.
 * Migrations run in alphanumeric order. Add `00002_…` for the next schema change.
 */
export class OdlMigrationProvider implements MigrationProvider {
  async getMigrations(): Promise<Record<string, Migration>> {
    return MIGRATIONS;
  }
}
