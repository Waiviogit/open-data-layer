const HIVE_API = Object.freeze({
  CONDENSER_API: 'condenser_api',
  BRIDGE: 'bridge',
  RC_API: 'rc_api',
} as const);

export const CONDENSER_API = Object.freeze({
  GET_BLOCK: `${HIVE_API.CONDENSER_API}.get_block`,
  GET_CONTENT: `${HIVE_API.CONDENSER_API}.get_content`,
  GET_ACTIVE_VOTES: `${HIVE_API.CONDENSER_API}.get_active_votes`,
  GET_ACCOUNTS: `${HIVE_API.CONDENSER_API}.get_accounts`,
  GET_FOLLOWERS: `${HIVE_API.CONDENSER_API}.get_followers`,
  GET_FOLLOWING: `${HIVE_API.CONDENSER_API}.get_following`,
  GET_DISCUSSIONS_BY_COMMENTS: `${HIVE_API.CONDENSER_API}.get_discussions_by_comments`,
  GET_CURRENT_MEDIAN_HISTORY_PRICE: `${HIVE_API.CONDENSER_API}.get_current_median_history_price`,
  GET_ACCOUNT_HISTORY: `${HIVE_API.CONDENSER_API}.get_account_history`,
  GET_DYNAMIC_GLOBAL_PROPERTIES: `${HIVE_API.CONDENSER_API}.get_dynamic_global_properties`,
  GET_REWARD_FUND: `${HIVE_API.CONDENSER_API}.get_reward_fund`,
  GET_VESTING_DELEGATIONS: `${HIVE_API.CONDENSER_API}.get_vesting_delegations`,
  GET_SAVINGS_WITHDRAW_FROM: `${HIVE_API.CONDENSER_API}.get_savings_withdraw_from`,
  GET_BLOG_ENTRIES: `${HIVE_API.CONDENSER_API}.get_blog_entries`,
} as const);

/** Hive `get_blog_entries` RPC limit ceiling (`limit` in `[1, 500]`). */
export const HIVE_BLOG_ENTRIES_MAX_LIMIT = 500;

export const RC_API = Object.freeze({
  FIND_RC_ACCOUNTS: `${HIVE_API.RC_API}.find_rc_accounts`,
  LIST_RC_DIRECT_DELEGATIONS: `${HIVE_API.RC_API}.list_rc_direct_delegations`,
} as const);

export const DATABASE_API = Object.freeze({
  FIND_VESTING_DELEGATIONS: 'database_api.find_vesting_delegations',
  FIND_VESTING_DELEGATION_EXPIRATIONS:
    'database_api.find_vesting_delegation_expirations',
} as const);

export const BRIDGE = Object.freeze({
  GET_DISCUSSION: `${HIVE_API.BRIDGE}.get_discussion`,
  GET_FOLLOW_LIST: `${HIVE_API.BRIDGE}.get_follow_list`,
} as const);

export const HIVE_RPC_NODES = [
  'https://api.deathwing.me',
  'https://api.hive.blog',
  'https://api.openhive.network',
  'https://rpc.mahdiyari.info',
];

/** Retries per `get_account_history` call (node rotation picks a new URL each attempt). */
export const HIVE_ACCOUNT_HISTORY_ATTEMPTS = 3;

/** Hive `get_account_history` RPC limit ceiling (`limit <= 1000`). */
export const HIVE_ACCOUNT_HISTORY_MAX_LIMIT = 1000;
