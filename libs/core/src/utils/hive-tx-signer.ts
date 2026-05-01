import { Client, DEFAULT_CHAIN_ID, Signature, SignedTransaction, cryptoUtils } from '@hiveio/dhive';

export type PostingSignerRelation = 'owner-posting-key' | 'delegated-posting-account';

export type PostingSignerCandidate = {
  account: string;
  relation: PostingSignerRelation;
  publicKey: string;
  weight: number;
};

export type PostingSignerResult = {
  owner: string;
  threshold: number;
  recoveredPublicKeys: string[];
  matches: PostingSignerCandidate[];
  probableSignerAccounts: string[];
};

type OperationTuple = [string, Record<string, unknown>];

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

  // Digest must be computed over the body without signatures.
  // transactionDigest accepts Buffer for chainId — DEFAULT_CHAIN_ID is the mainnet constant.
  const digest = cryptoUtils.transactionDigest(txBody as SignedTransaction, DEFAULT_CHAIN_ID);

  return signatures.map((sig) => Signature.fromString(sig).recover(digest).toString());
}

async function buildPostingCandidates(
  owner: string,
  client: Client,
): Promise<{ owner: string; threshold: number; candidates: PostingSignerCandidate[] }> {
  const [ownerAccount] = await client.database.getAccounts([owner]);
  if (!ownerAccount) {
    throw new Error(`Account not found: ${owner}`);
  }

  const candidates: PostingSignerCandidate[] = [];

  for (const [key, weight] of ownerAccount.posting.key_auths) {
    candidates.push({
      account: owner,
      relation: 'owner-posting-key',
      // key_auths is typed [string | PublicKey, number][] — normalize to string
      publicKey: String(key),
      weight,
    });
  }

  for (const [delegatedAccountName, delegatedWeight] of ownerAccount.posting.account_auths) {
    const [delegatedAccount] = await client.database.getAccounts([delegatedAccountName]);
    if (!delegatedAccount) {
      continue;
    }

    for (const [key] of delegatedAccount.posting.key_auths) {
      candidates.push({
        account: delegatedAccountName,
        relation: 'delegated-posting-account',
        publicKey: String(key),
        weight: delegatedWeight,
      });
    }
  }

  return { owner, threshold: ownerAccount.posting.weight_threshold, candidates };
}

/**
 * Recovers which Hive account(s) signed a transaction using the posting authority.
 *
 * For each account listed in required_posting_auths (and common operation-specific
 * authority fields), it resolves the posting key candidates — including one level
 * of account_auths delegation — and cross-checks them against the public keys
 * recovered from the transaction signatures.
 *
 * @see docs/spec/hive-tx-signer.md
 */
export async function detectPostingSigner(
  tx: SignedTransaction,
  client: Client,
): Promise<PostingSignerResult[]> {
  const recoveredPublicKeys = recoverPublicKeysFromTx(tx);
  const requiredPostingAuths = getRequiredPostingAuths(tx);

  const results: PostingSignerResult[] = [];

  for (const owner of requiredPostingAuths) {
    const auth = await buildPostingCandidates(owner, client);
    const matches = auth.candidates.filter((c) => recoveredPublicKeys.includes(c.publicKey));

    results.push({
      owner,
      threshold: auth.threshold,
      recoveredPublicKeys,
      matches,
      probableSignerAccounts: [...new Set(matches.map((m) => m.account))],
    });
  }

  return results;
}
