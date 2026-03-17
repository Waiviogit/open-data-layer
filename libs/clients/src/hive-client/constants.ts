const HIVE_API = Object.freeze({
  CONDENSER_API: 'condenser_api',
  BRIDGE: 'bridge',
} as const);

export const CONDENSER_API = Object.freeze({
  GET_BLOCK: `${HIVE_API.CONDENSER_API}.get_block`,
  GET_CONTENT: `${HIVE_API.CONDENSER_API}.get_content`,
  GET_ACTIVE_VOTES: `${HIVE_API.CONDENSER_API}.get_active_votes`,
} as const);

export const BRIDGE = Object.freeze({
  GET_DISCUSSION: `${HIVE_API.BRIDGE}.get_discussion`,
} as const);
