import { buildCustomJsonOp } from '@opden-data-layer/hive-broadcast';

export type BuildOdlCustomJsonOpInput = {
  /** Hive `custom_json.id` (`odl-mainnet` / `odl-testnet` from {@link useOdlCustomJsonId}). */
  readonly id: string;
  readonly required_auths?: readonly string[];
  readonly required_posting_auths?: readonly string[];
  /** ODL envelope JSON string or serializable object. */
  readonly json: string | Record<string, unknown>;
};

/**
 * Builds a Hive `custom_json` op for an ODL envelope.
 */
export function buildOdlCustomJsonOp(input: BuildOdlCustomJsonOpInput) {
  const json =
    typeof input.json === 'string' ? input.json : JSON.stringify(input.json);
  return buildCustomJsonOp({
    required_auths: input.required_auths ?? [],
    required_posting_auths: input.required_posting_auths ?? [],
    id: input.id,
    json,
  });
}
