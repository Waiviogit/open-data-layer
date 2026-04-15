
export const HIVE_OPERATION = Object.freeze({
  TRANSFER: 'transfer',
  COMMENT: 'comment',
  DELETE_COMMENT: 'delete_comment',
  CUSTOM_JSON: 'custom_json',
  ACCOUNT_UPDATE: 'account_update',
  CREATE_ACCOUNT: 'create_account',
  CREATE_CLAIMED_ACCOUNT: 'create_claimed_account',
} as const);

/** Hive `custom_json` id for follow / reblog / mute (JSON array payload). */
export const HIVE_CUSTOM_JSON_ID = Object.freeze({
  FOLLOW: 'follow',
} as const);

export const CUSTOM_JSON_ID = Object.freeze({
  ODL_MAINNET: 'odl-mainnet',
  ODL_TESTNET: 'odl-testnet',
  WAIVIO_OPERATIONS: 'waivio_operations',
  HIVE_ENGINE: 'ssc-mainnet-hive',
} as const);
