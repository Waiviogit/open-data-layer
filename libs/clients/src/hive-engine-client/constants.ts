export const HIVE_ENGINE_NODES = [
  'https://enginerpc.com',
  'https://api.hive-engine.com/rpc',
  'https://v6-he.atexoras.com:2083',
  'https://herpc.actifit.io',
  'https://he.c0ff33a.uk',
] as const;

export const HE_ENDPOINT = Object.freeze({
  CONTRACTS: 'contracts',
  BLOCKCHAIN: 'blockchain',
} as const);

export const JSON_RPC_REQUEST_ID = 'ssc-mainnet-hive';
