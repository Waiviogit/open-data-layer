import { DEFAULT_CHAIN_ID, Signature, SignedTransaction, cryptoUtils } from '@hiveio/dhive';

export type PostingSignerResult = {
  recoveredPublicKeys: string[];
  /** Accounts resolved from recovered keys via get_key_references. */
  resolvedAccounts: string[][];
  /** Accounts from resolvedAccounts that are also in required_posting_auths. */
  signers: string[];
};

type OperationTuple = [string, Record<string, unknown>];

/** JSON-RPC caller — pass the node's hiveRequest or any compatible fetch wrapper. */
export type HiveRpcCaller = <T>(method: string, params: unknown) => Promise<T | undefined>;

function getRequiredPostingAuths(tx: SignedTransaction): string[] {
  const result = new Set<string>();

  for (const [opName, op] of tx.operations as OperationTuple[]) {
    if (opName === 'custom_json') {
      for (const account of (op['required_posting_auths'] as string[] | undefined) ?? []) {
        result.add(account);
      }
    } else if (opName === 'comment') {
      result.add(op['author'] as string);
    } else if (opName === 'vote') {
      result.add(op['voter'] as string);
    } else if (opName === 'reblog') {
      result.add(op['account'] as string);
    }
  }

  return [...result];
}

function recoverPublicKeysFromTx(tx: SignedTransaction): string[] {
  const { signatures, ...txBody } = tx;

  // Digest is computed over the body without signatures.
  // transactionDigest expects Buffer for chainId — DEFAULT_CHAIN_ID is the mainnet constant.
  const digest = cryptoUtils.transactionDigest(txBody as SignedTransaction, DEFAULT_CHAIN_ID);

  return signatures.map((sig) => Signature.fromString(sig).recover(digest).toString());
}

/**
 * Recovers which Hive account(s) signed a transaction.
 *
 * Uses `condenser_api.get_key_references` to map recovered public keys directly
 * to account names — no need to iterate account authorities manually.
 * The `signers` field contains only accounts that appear in `required_posting_auths`
 * (or operation-specific authority fields).
 *
 * @param tx     A fully signed Hive transaction.
 * @param rpc    Any function that calls a Hive JSON-RPC node, matching the
 *               `HiveRpcCaller` signature. Pass `hiveClient`'s internal caller
 *               or a simple fetch wrapper.
 *
 * @see docs/spec/hive-tx-signer.md
 */
export async function detectPostingSigner(
  tx: SignedTransaction,
  rpc: HiveRpcCaller,
): Promise<PostingSignerResult> {
  const recoveredPublicKeys = recoverPublicKeysFromTx(tx);
  const requiredPostingAuths = new Set(getRequiredPostingAuths(tx));

  // get_key_references: [publicKey[]] → account[][] (one inner array per key)
  const resolvedAccounts =
    (await rpc<string[][]>('condenser_api.get_key_references', [recoveredPublicKeys])) ?? [];

  const signers = [
    ...new Set(
      resolvedAccounts.flat().filter((account) => requiredPostingAuths.has(account)),
    ),
  ];

  return { recoveredPublicKeys, resolvedAccounts, signers };
}
