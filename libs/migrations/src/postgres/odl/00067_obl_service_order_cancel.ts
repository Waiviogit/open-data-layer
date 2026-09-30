import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Soft-cancel for OBL service orders: status + who/when cancelled.
 * @see docs/spec/obl/service-orders.md
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE obl_service_orders
    ADD COLUMN status TEXT NOT NULL DEFAULT 'active',
    ADD COLUMN cancelled_by TEXT,
    ADD COLUMN cancelled_at TIMESTAMPTZ,
    ADD COLUMN cancelled_event_seq BIGINT,
    ADD COLUMN cancelled_transaction_id TEXT
  `.execute(db);

  await sql`
    ALTER TABLE obl_service_orders
    ADD CONSTRAINT obl_service_orders_status_check
    CHECK (status IN ('active', 'cancelled'))
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE obl_service_orders
    DROP CONSTRAINT IF EXISTS obl_service_orders_status_check
  `.execute(db);

  await sql`
    ALTER TABLE obl_service_orders
    DROP COLUMN IF EXISTS cancelled_transaction_id,
    DROP COLUMN IF EXISTS cancelled_event_seq,
    DROP COLUMN IF EXISTS cancelled_at,
    DROP COLUMN IF EXISTS cancelled_by,
    DROP COLUMN IF EXISTS status
  `.execute(db);
}
