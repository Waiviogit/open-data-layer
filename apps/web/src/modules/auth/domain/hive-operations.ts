/**
 * Normalized Hive operation shapes (domain layer).
 * Signing/broadcast adapters map these to provider-specific wire formats.
 */

export type VoteOp = {
  readonly type: 'vote';
  readonly voter: string;
  readonly author: string;
  readonly permlink: string;
  /** Vote weight in basis points (10000 = 100%). */
  readonly weight: number;
};

export type CommentOp = {
  readonly type: 'comment';
  readonly parent_author: string;
  readonly parent_permlink: string;
  readonly author: string;
  readonly permlink: string;
  readonly title: string;
  readonly body: string;
  readonly json_metadata: string;
};

export type CommentOptionsOp = {
  readonly type: 'comment_options';
  readonly author: string;
  readonly permlink: string;
  readonly max_accepted_payout: string;
  readonly allow_votes: boolean;
  readonly allow_curation_rewards: boolean;
  readonly extensions: readonly unknown[];
};

export type CustomJsonOp = {
  readonly type: 'custom_json';
  readonly required_auths: readonly string[];
  readonly required_posting_auths: readonly string[];
  readonly id: string;
  readonly json: string;
};

/** Native chain reblog (not expressed as custom_json). */
export type ReblogOp = {
  readonly type: 'reblog';
  readonly account: string;
  readonly author: string;
  readonly permlink: string;
};

export type HiveOperation = VoteOp | CommentOp | CommentOptionsOp | CustomJsonOp | ReblogOp;

export type HiveOperationPayload = {
  readonly operations: readonly HiveOperation[];
};
