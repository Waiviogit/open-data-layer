import { Transaction } from '@hiveio/dhive/lib/chain/transaction';

/** Transaction with transaction_id and block_num populated by the Hive API in block responses */
export interface HiveTransaction extends Transaction {
  transaction_id: string;
  block_num: number;
}

export type VoteOnPostType = {
  key: string;
  voter: string;
  author: string;
  permlink: string;
  weight: number;
};

export type BroadcastCommentType = {
  key: string;
  parent_author: string;
  parent_permlink: string;
  author: string;
  permlink: string;
  title: string;
  body: string;
  json_metadata: string;
};

export type HiveContentType = {
  id: number;
  author: string;
  permlink: string;
  parent_author: string;
  parent_permlink: string;
  root_author: string;
  root_permlink: string;
  title: string;
  body: string;
  json_metadata: string;
  app: string;
  depth: string;
  total_vote_weight: number;
  language: string;
  author_weight: number;
  reblog_to: ReblogToType;
  category: string;
  created: string;
  last_update: string;
  last_payout: string;
  cashout_time: string;
  total_payout_value: string;
  curator_payout_value: string;
  pending_payout_value: string;
  max_accepted_payout: string;
  active: string;
  url: string;
  max_cashout_time: string;
  root_title: string;
  promoted: string;
  total_pending_payout_value: string;
  children: number;
  body_length: number;
  author_reputation: number;
  percent_hbd: number;
  author_rewards: number;
  reward_weight: number;
  reblogged_by: [];
  net_votes: number;
  children_abs_rshares: number;
  vote_rshares: number;
  net_rshares: number;
  abs_rshares: number;
  allow_votes: boolean;
  allow_curation_rewards: boolean;
  allow_replies: boolean;
  beneficiaries: BeneficiariesType[];
  blocked_for_apps: string[];
  reblogged_users: string[];
  /** Child comment keys (`author/permlink`) from `bridge.get_discussion`. */
  replies?: string[];
  active_votes: ActiveVotesType[];
};

export type ActiveVotesType = {
  voter: string;
  weight: number;
  percent: number;
  reputation: number;
  rshares: number;
};

export type BeneficiariesType = {
  account: string;
  weight: number;
};

export type ReblogToType = {
  author: string;
  permlink: string;
};

/** One row from `condenser_api.get_blog_entries`. */
export type HiveBlogEntry = {
  blog: string;
  author: string;
  permlink: string;
  entry_id: number;
  reblogged_on: string;
};

export type CommentStateType = {
  content: Record<string, HiveContentType>;
};

/** Wallet-related fields from `condenser_api.get_accounts`. */
export type HiveManabar = {
  current_mana?: string | number;
  last_update_time?: number;
};

/** Hive authority object (owner / active / posting). */
export type HiveAuthority = {
  weight_threshold?: number;
  account_auths?: [string, number][];
  key_auths?: [string, number][];
};

/** Wallet-related fields from `condenser_api.get_accounts`. */
export type HiveAccountWalletFields = {
  balance: string;
  hbd_balance: string;
  vesting_shares: string;
  delegated_vesting_shares: string;
  received_vesting_shares: string;
  savings_balance: string;
  savings_hbd_balance: string;
  savings_hbd_seconds: string;
  savings_hbd_seconds_last_update: string;
  savings_hbd_last_interest_payment: string;
  to_withdraw: string | number;
  /** VESTS already paid out this power down (condenser integer satoshis). */
  withdrawn: string | number;
  vesting_withdraw_rate: string;
  next_vesting_withdrawal: string;
  reward_hive_balance?: string;
  reward_hbd_balance?: string;
  reward_vesting_balance?: string;
  reward_vesting_hive?: string;
  voting_power?: number;
  last_vote_time?: string;
  reputation?: number;
  voting_manabar?: HiveManabar;
  downvote_manabar?: HiveManabar;
  memo_key?: string;
};

export type HiveRewardFund = {
  id: number;
  name: string;
  reward_balance: string;
  recent_claims: string;
};

/** Subset of `condenser_api.get_accounts` result used for indexer sync and wallet. */
export type HiveAccountType = {
  id: number;
  name: string;
  json_metadata: string;
  posting_json_metadata: string;
  created: string;
  comment_count: number;
  lifetime_vote_count: number;
  post_count: number;
  last_post: string;
  last_root_post: string;
  owner?: HiveAuthority;
  active?: HiveAuthority;
  posting?: HiveAuthority;
} & Partial<HiveAccountWalletFields>;

/** One row from vesting delegation RPCs (`condenser_api` or `database_api`). */
export type HiveVestingDelegation = {
  delegator: string;
  delegatee: string;
  vesting_shares: string | { amount: string; precision?: number };
  min_delegation_time: string;
};

/** One row from `database_api.find_vesting_delegation_expirations`. */
export type HiveVestingDelegationExpiration = {
  delegator: string;
  vesting_shares: string | { amount: string; precision?: number };
  completion_date?: string;
};

export type HiveFindVestingDelegationsResult = {
  delegations: HiveVestingDelegation[];
};

export type HiveFindVestingDelegationExpirationsResult = {
  delegations: HiveVestingDelegationExpiration[];
};

/** One row from `rc_api.find_rc_accounts`. */
export type HiveRcAccount = {
  account: string;
  rc_manabar: {
    current_mana: string;
    last_update_time: number;
  };
  max_rc: string;
  delegated_rc: string;
  received_delegated_rc: string;
};

/** One row from `rc_api.list_rc_direct_delegations`. */
export type HiveRcDelegation = {
  from: string;
  to: string;
  delegated_rc: number;
};

/** One row from `condenser_api.get_savings_withdraw_from`. */
export type HiveSavingsWithdrawRequest = {
  id: number;
  from: string;
  request_id: number;
  amount: string;
  to: string;
  memo: string;
  complete?: string;
};

/** One row from `condenser_api.get_followers` / `get_following`. */
export type HiveFollowRelation = {
  follower: string;
  following: string;
  what: string[];
};

/** One row from `bridge.get_follow_list` (muted). */
export type HiveMutedAccount = {
  name: string;
};

/** Result of `condenser_api.get_current_median_history_price`. */
export type HiveCurrentMedianHistoryPrice = {
  base: string;
  quote: string;
};

/** One entry from `condenser_api.get_account_history` (index + operation row). */
export type HiveAccountHistoryEntry = {
  trx_id: string;
  block: number;
  trx_in_block: number;
  op_in_trx: number;
  virtual_op: boolean;
  timestamp: string;
  op: [string, Record<string, unknown>];
};

export type HiveAccountHistoryRow = [number, HiveAccountHistoryEntry];

/** Bitmask pair for Hive `get_account_history` operation filters. */
export type HiveOperationFilter = {
  filterLow: number | string;
  filterHigh: number | string;
};

/** One `get_account_history` RPC page (may include Hive assert continue hint). */
export type HiveAccountHistoryPage = {
  rows: HiveAccountHistoryRow[];
  /** Next operation index when Hive returns Assert Exception with `sequence`. */
  continueFrom?: number;
};

/** Result of `condenser_api.get_dynamic_global_properties`. */
export type HiveDynamicGlobalProperties = {
  total_vesting_shares: string;
  /** Legacy condenser field name (pre-HIVE rename). */
  total_vesting_fund_steem?: string;
  /** Current condenser field name. */
  total_vesting_fund_hive?: string;
  /** Basis points per year (e.g. 2000 = 20% APR). */
  hbd_interest_rate?: number;
  head_block_number?: number;
};
