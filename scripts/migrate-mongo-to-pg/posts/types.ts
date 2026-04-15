/**
 * Loose shapes for MongoDB post export (mongoexport / extended JSON).
 * @see tmp/PostSchema.js
 */

import type { MongoId } from '../objects/types';

export interface MongoPostActiveVote {
  voter?: string;
  weight?: number;
  percent?: number;
  rshares?: number;
  rsharesWAIV?: number;
}

export interface MongoPostWobject {
  author_permlink?: string;
  percent?: number;
  object_type?: string;
}

/** New export shape; aligns with chain-indexer `json_metadata.objects`. */
export interface MongoPostObjectEntry {
  object_id?: string;
  percent?: number;
}

export interface MongoPostReblogTo {
  author?: string;
  permlink?: string;
}

/** Mongo extended JSON date */
export interface MongoDate {
  $date: string | number;
}

export interface MongoPost {
  id?: number;
  author?: string;
  author_reputation?: number;
  author_weight?: number;
  permlink?: string;
  parent_author?: string;
  parent_permlink?: string;
  title?: string;
  body?: string;
  json_metadata?: string;
  app?: string;
  depth?: number;
  category?: string;
  last_update?: string;
  created?: string;
  active?: string;
  last_payout?: string;
  children?: number;
  net_rshares?: number;
  abs_rshares?: number;
  vote_rshares?: number;
  children_abs_rshares?: number;
  cashout_time?: string;
  reward_weight?: string;
  total_payout_value?: string;
  curator_payout_value?: string;
  author_rewards?: number;
  net_votes?: number;
  root_author?: string;
  root_permlink?: string;
  root_title?: string;
  max_accepted_payout?: string;
  percent_steem_dollars?: number;
  allow_replies?: boolean;
  allow_votes?: boolean;
  allow_curation_rewards?: boolean;
  beneficiaries?: { account?: string; weight?: number }[];
  url?: string;
  pending_payout_value?: string;
  total_pending_payout_value?: string;
  total_vote_weight?: number;
  promoted?: string;
  body_length?: number;
  active_votes?: MongoPostActiveVote[];
  /** Preferred over `wobjects` when present. */
  objects?: MongoPostObjectEntry[];
  /** Hive string tags (object_id candidates at percent 0). */
  tags?: string[];
  wobjects?: MongoPostWobject[];
  languages?: string[];
  reblog_to?: MongoPostReblogTo;
  reblogged_users?: string[];
  net_rshares_WAIV?: number;
  total_payout_WAIV?: number;
  total_rewards_WAIV?: number;
  links?: string[];
  mentions?: string[];
  _id?: MongoId;
  /** Mongoose timestamps if present in export */
  createdAt?: string | Date | MongoDate;
  updatedAt?: string | Date | MongoDate;
}
