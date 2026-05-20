/**
 * Public env for ODL `custom_json` id (`odl-mainnet` vs `odl-testnet`).
 * Safe to import from Client Components — only `NEXT_PUBLIC_*` keys.
 */
import { parseOdlNetwork, resolveOdlCustomJsonId } from './odl-network';

export const ODL_NETWORK = parseOdlNetwork(process.env.NEXT_PUBLIC_ODL_NETWORK);

/** Hive `custom_json.id` for ODL envelope broadcasts on this deployment. */
export const ODL_CUSTOM_JSON_ID = resolveOdlCustomJsonId(ODL_NETWORK);
