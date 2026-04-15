const HIVE_API = Object.freeze({
  CONDENSER_API: 'condenser_api',
  BRIDGE: 'bridge',
} as const);

export const CONDENSER_API = Object.freeze({
  GET_BLOCK: `${HIVE_API.CONDENSER_API}.get_block`,
  GET_CONTENT: `${HIVE_API.CONDENSER_API}.get_content`,
  GET_ACTIVE_VOTES: `${HIVE_API.CONDENSER_API}.get_active_votes`,
  GET_ACCOUNTS: `${HIVE_API.CONDENSER_API}.get_accounts`,
  GET_FOLLOWERS: `${HIVE_API.CONDENSER_API}.get_followers`,
  GET_FOLLOWING: `${HIVE_API.CONDENSER_API}.get_following`,
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
