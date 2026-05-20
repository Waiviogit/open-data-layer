import { buildCustomJsonOp } from '@opden-data-layer/hive-broadcast';

import { ODL_CUSTOM_JSON_ID } from '@/config/odl-network-public';

export type BuildOdlCustomJsonOpInput = {
  readonly required_auths?: readonly string[];
  readonly required_posting_auths?: readonly string[];
  /** ODL envelope JSON string or serializable object. */
  readonly json: string | Record<string, unknown>;
};

/**
 * Builds a Hive `custom_json` op using the deployment ODL network id
 * (`odl-mainnet` or `odl-testnet` from `NEXT_PUBLIC_ODL_NETWORK`).
 */
export function buildOdlCustomJsonOp(input: BuildOdlCustomJsonOpInput) {
  const json =
    typeof input.json === 'string' ? input.json : JSON.stringify(input.json);
  return buildCustomJsonOp({
    required_auths: input.required_auths ?? [],
    required_posting_auths: input.required_posting_auths ?? [],
    id: ODL_CUSTOM_JSON_ID,
    json,
  });
}
