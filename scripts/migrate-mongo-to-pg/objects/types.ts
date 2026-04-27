/**
 * Loose shapes for MongoDB wobject export (mongoexport / extended JSON).
 * @see tmp/wObjectSchema.js
 */

export interface MongoOid {
  $oid: string;
}

export type MongoId = string | MongoOid;

export interface MongoActiveVote {
  voter?: string;
  weight?: number;
  percent?: number;
  rshares_weight?: number;
  block?: number;
  weightWAIV?: number;
}

/** Legacy Waivio rank vote (field `rating` / aggregate rating); Mongo scale 0–10. */
export interface MongoRatingVote {
  voter?: string;
  rank?: number;
}

export interface MongoWObjectField {
  name?: string;
  body?: string;
  weight?: number;
  weightWAIV?: number;
  locale?: string;
  tagCategory?: string;
  creator?: string;
  author?: string;
  permlink?: string;
  id?: string;
  active_votes?: MongoActiveVote[];
  _id?: MongoId;
  /** Rank votes for `name: "rating"` only; 0–10 in Mongo, migrated to `rank_votes` (0–10000). */
  rating_votes?: MongoRatingVote[];
  /** Legacy promotion/sale window (often ms since epoch). */
  startDate?: number;
  endDate?: number;
}

export interface MongoWObject {
  app?: string;
  community?: string;
  object_type?: string;
  default_name?: string;
  is_posting_open?: boolean;
  is_extending_open?: boolean;
  creator?: string;
  author?: string;
  author_permlink?: string;
  weight?: number;
  count_posts?: number;
  parent?: string;
  children?: string[];
  fields?: MongoWObjectField[];
  map?: {
    type?: string;
    coordinates?: number[];
  };
  metaGroupId?: string;
  _id?: MongoId;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
