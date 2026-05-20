/** Hive `custom_json` ids for ODL envelopes (must match chain-indexer `hive.odlCustomJsonId`). */
export const CUSTOM_JSON_ID = Object.freeze({
  ODL_MAINNET: 'odl-mainnet',
  ODL_TESTNET: 'odl-testnet',
} as const);

export type OdlNetwork = 'mainnet' | 'testnet';

export function parseOdlNetwork(value: string | undefined): OdlNetwork {
  const normalized = (value ?? 'mainnet').trim().toLowerCase();
  return normalized === 'testnet' ? 'testnet' : 'mainnet';
}

export function resolveOdlCustomJsonId(network: OdlNetwork): string {
  return network === 'testnet'
    ? CUSTOM_JSON_ID.ODL_TESTNET
    : CUSTOM_JSON_ID.ODL_MAINNET;
}
