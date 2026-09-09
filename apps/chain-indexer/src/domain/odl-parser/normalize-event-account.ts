import { normalizeHiveAccountName } from '../hive-delegation';

/**
 * Payload account fields (`creator`, `voter`) are advisory: authority comes from
 * `required_posting_auths[0]` (= ctx.creator), already validated by Hive consensus.
 * Returns the authoritative account and whether the payload disagreed.
 */
export function resolveEventAccount(
  signerAccount: string,
  payloadAccount: string,
): { account: string; mismatch: boolean } {
  const account = normalizeHiveAccountName(signerAccount);
  const claimed = normalizeHiveAccountName(payloadAccount);
  return { account, mismatch: claimed !== '' && claimed !== account };
}
