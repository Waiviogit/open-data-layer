/**
 * Table schemas and row types for the PostgreSQL concept schema.
 * Table interfaces are used only in the `OdlDatabase` type; use
 * `Selectable`, `Insertable`, and `Updateable` types for queries.
 * @see spec/postgres-concept/schema.sql
 * @see spec/postgres-concept/flow.md
 */

import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from 'kysely';

type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface OdlDatabase {
  objects_core: ObjectsCoreTable;
  object_updates: ObjectUpdatesTable;
  validity_votes: ValidityVotesTable;
  rank_votes: RankVotesTable;
  accounts_current: AccountsCurrentTable;
}

// ---------------------------------------------------------------------------
// objects_core
// ---------------------------------------------------------------------------

export interface ObjectsCoreTable {
  object_id: string;
  object_type: string;
  creator: string;
  weight: number | null;
  meta_group_id: string | null;
  transaction_id: string;
  /** DEFAULT 0; optional on insert. */
  seq: ColumnType<number, number | undefined, number>;
}

export type ObjectsCore = Selectable<ObjectsCoreTable>;
export type NewObjectsCore = Insertable<ObjectsCoreTable>;
export type ObjectsCoreUpdate = Updateable<ObjectsCoreTable>;

// ---------------------------------------------------------------------------
// object_updates
// ---------------------------------------------------------------------------

export interface ObjectUpdatesTable {
  update_id: string;
  object_id: string;
  update_type: string;
  creator: string;
  created_at_unix: number;
  /** Packed canonical order: block_num|trx_index|op_index|odl_event_index. See event-seq.ts. */
  event_seq: bigint;
  transaction_id: string;
  value_text: string | null;
  value_geo: unknown;
  value_json: ColumnType<JsonValue>;
  /** GENERATED ALWAYS AS (LOWER(TRIM(value_text))) STORED; read-only. */
  value_text_normalized: Generated<string | null>;
  search_vector: unknown;
}

export type ObjectUpdate = Selectable<ObjectUpdatesTable>;
export type NewObjectUpdate = Insertable<ObjectUpdatesTable>;
export type ObjectUpdateUpdate = Updateable<ObjectUpdatesTable>;

// ---------------------------------------------------------------------------
// validity_votes
// ---------------------------------------------------------------------------

export interface ValidityVotesTable {
  update_id: string;
  object_id: string;
  voter: string;
  vote: 'for' | 'against';
  /** Packed canonical order: block_num|trx_index|op_index|odl_event_index. See event-seq.ts. */
  event_seq: bigint;
  transaction_id: string;
}

export type ValidityVote = Selectable<ValidityVotesTable>;
export type NewValidityVote = Insertable<ValidityVotesTable>;
export type ValidityVoteUpdate = Updateable<ValidityVotesTable>;


// ---------------------------------------------------------------------------
// rank_votes
// ---------------------------------------------------------------------------

export interface RankVotesTable {
  update_id: string;
  object_id: string;
  voter: string;
  rank: number;
  rank_context: string;
  /** Packed canonical order: block_num|trx_index|op_index|odl_event_index. See event-seq.ts. */
  event_seq: bigint;
  transaction_id: string;
}

export type RankVote = Selectable<RankVotesTable>;
export type NewRankVote = Insertable<RankVotesTable>;
export type RankVoteUpdate = Updateable<RankVotesTable>;

// ---------------------------------------------------------------------------
// accounts_current
// ---------------------------------------------------------------------------

export interface AccountsCurrentTable {
  name: string;
  hive_id: number | null;
  json_metadata: string | null;
  posting_json_metadata: string | null;
  created: string | null;
  comment_count: number;
  lifetime_vote_count: number;
  post_count: number;
  last_post: string | null;
  last_root_post: string | null;
  object_reputation: number;
  updated_at_unix: number | null;
}

export type AccountCurrent = Selectable<AccountsCurrentTable>;
export type NewAccountCurrent = Insertable<AccountsCurrentTable>;
export type AccountCurrentUpdate = Updateable<AccountsCurrentTable>;
