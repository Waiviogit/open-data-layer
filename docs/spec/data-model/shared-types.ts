/**
 * Shared types for PostgreSQL concept.
 * Enums and value kinds for PostgreSQL row interfaces (historically aligned with evaluated Mongo v2 types).
 * Position is inlined as columns in SQL; geo uses PostGIS (no GeoPoint wrapper in DB).
 */

/**
 * Cardinality and value kind are properties of the update type definition
 * in the application-level update registry (see object-type-entity.md),
 * not stored in the database. Re-exported here for use in registry types.
 */
export type UpdateCardinality = 'single' | 'multi';
export type ValidityVoteValue = 'for' | 'against';
export type ValueKind = 'text' | 'geo' | 'json' | 'object_ref';

/**
 * Canonical event position.
 * All three child tables (object_updates, validity_votes, rank_votes) store
 * a packed BIGINT `event_seq` (block_num|trx_index|op_index|odl_event_index)
 * plus a reference `transaction_id`.
 * See libs/core/src/event-seq.ts for encoding/decoding.
 */
export interface CanonicalPositionColumns {
  event_seq: bigint;
  transaction_id: string;
}

/**
 * Application-level geo coordinates for building INSERT statements.
 * In SQL use: ST_MakePoint(lon, lat)::geography
 * When reading back without ST_AsGeoJSON, the driver returns WKB (unknown).
 */
export type GeoCoordinates = [lon: number, lat: number];
