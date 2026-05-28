import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Denormalize object_type on materialized tag rows for discover facet queries (no JOIN).
 * Table should be empty or truncated before migrate; chain-indexer backfill repopulates active rows.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE object_tag_category_items
    ADD COLUMN object_type TEXT
  `.execute(db);

  await sql`
    UPDATE object_tag_category_items tci
    SET object_type = oc.object_type
    FROM objects_core oc
    WHERE oc.object_id = tci.object_id
  `.execute(db);

  await sql`
    DELETE FROM object_tag_category_items
    WHERE object_type IS NULL
  `.execute(db);

  await sql`
    ALTER TABLE object_tag_category_items
    ALTER COLUMN object_type SET NOT NULL
  `.execute(db);

  await sql`DROP INDEX IF EXISTS idx_object_tag_category_items_cat_val`.execute(db);

  await sql`
    CREATE INDEX idx_otci_type_cat_val
    ON object_tag_category_items (object_type, category, value)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_otci_type_cat_val`.execute(db);

  await sql`
    CREATE INDEX idx_object_tag_category_items_cat_val
    ON object_tag_category_items (category, value)
  `.execute(db);

  await sql`
    ALTER TABLE object_tag_category_items
    DROP COLUMN object_type
  `.execute(db);
}
