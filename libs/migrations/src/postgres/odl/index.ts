import * as m00001 from './00001_odl_schema';
import * as m00002 from './00002_scheduler';
import * as m00003 from './00003_site_canonical';
import * as m00004 from './00004_rank_votes_rank_range';
import * as m00005 from './00005_object_categories';
import * as m00006 from './00006_user_metadata_shop_fields';
import type { Migration } from 'kysely';

/** Ordered migrations for OdlMigrationProvider. Schema matches @opden-data-layer/core OdlDatabase and docs/spec/data-model/schema.sql */
export const MIGRATIONS: Record<string, Migration> = {
  '00001_odl_schema': { up: m00001.up, down: m00001.down },
  '00002_scheduler': { up: m00002.up, down: m00002.down },
  '00003_site_canonical': { up: m00003.up, down: m00003.down },
  '00004_rank_votes_rank_range': { up: m00004.up, down: m00004.down },
  '00005_object_categories': { up: m00005.up, down: m00005.down },
  '00006_user_metadata_shop_fields': { up: m00006.up, down: m00006.down },
};
