import * as m00001 from './00001_initial_odl_schema';
import * as m00002 from './00002_auth_tables';
import * as m00003 from './00003_user_post_drafts';
import * as m00004 from './00004_threads';
import * as m00005 from './00005_post_objects_drop_tagged';
import * as m00006 from './00006_user_account_mutes';
import type { Migration } from 'kysely';

/** Ordered migrations for OdlMigrationProvider. Schema matches @opden-data-layer/core OdlDatabase and docs/spec/data-model/schema.sql */
export const MIGRATIONS: Record<string, Migration> = {
  '00001_initial_odl_schema': { up: m00001.up, down: m00001.down },
  '00002_auth_tables': { up: m00002.up, down: m00002.down },
  '00003_user_post_drafts': { up: m00003.up, down: m00003.down },
  '00004_threads': { up: m00004.up, down: m00004.down },
  '00005_post_objects_drop_tagged': { up: m00005.up, down: m00005.down },
  '00006_user_account_mutes': { up: m00006.up, down: m00006.down },
};
