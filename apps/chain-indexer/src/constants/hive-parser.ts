
export const HIVE_OPERATION = Object.freeze({
  TRANSFER: 'transfer',
  COMMENT: 'comment',
  DELETE_COMMENT: 'delete_comment',
  CUSTOM_JSON: 'custom_json',
  ACCOUNT_UPDATE: 'account_update',
  ACCOUNT_UPDATE2: 'account_update2',
  CREATE_ACCOUNT: 'account_create',
  CREATE_CLAIMED_ACCOUNT: 'create_claimed_account',
  RECOVER_ACCOUNT: 'recover_account',
  VOTE: 'vote',
  DELEGATE_VESTING_SHARES: 'delegate_vesting_shares',
  TRANSFER_TO_VESTING: 'transfer_to_vesting',
  WITHDRAW_VESTING: 'withdraw_vesting',
  CLAIM_REWARD_BALANCE: 'claim_reward_balance',
  ACCOUNT_WITNESS_VOTE: 'account_witness_vote',
  CHANGE_RECOVERY_ACCOUNT: 'change_recovery_account',
  SET_WITHDRAW_VESTING_ROUTE: 'set_withdraw_vesting_route',
  TRANSFER_FROM_SAVINGS: 'transfer_from_savings',
  FILL_ORDER: 'fill_order',
} as const);

/** Hive `custom_json` id for follow / reblog / mute (JSON array payload). */
export const HIVE_CUSTOM_JSON_ID = Object.freeze({
  FOLLOW: 'follow',
  RC: 'rc',
} as const);

export const CUSTOM_JSON_ID = Object.freeze({
  ODL_MAINNET: 'odl-mainnet',
  ODL_TESTNET: 'odl-testnet',
  OBL_MAINNET: 'obl-mainnet',
  OBL_TESTNET: 'obl-testnet',
  OSL_MAINNET: 'osl-mainnet',
  OSL_TESTNET: 'osl-testnet',
  WAIVIO_OPERATIONS: 'waivio_operations',
  HIVE_ENGINE: 'ssc-mainnet-hive',
} as const);
