
export const HIVE_OPERATION = Object.freeze({
  TRANSFER: 'transfer',
  COMMENT: 'comment',
  CUSTOM_JSON: 'custom_json',
  ACCOUNT_UPDATE: 'account_update',
} as const);

export const CUSTOM_JSON_ID = Object.freeze({
  WAIVIO_OPERATIONS: 'waivio_operations',
  HIVE_ENGINE: 'ssc-mainnet-hive',
} as const);
