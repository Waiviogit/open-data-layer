'use client';

import type { IHiveSigner } from '../../application/ports/hive-signer.port';
import type { HiveOperation, HiveOperationPayload } from '../../domain/hive-operations';
import type { BroadcastTransactionResult } from '../../domain/types';
import type { KeychainWireOperation, HiveKeychainWindow } from '../providers/keychain-provider';

function resolveSigningAccount(operations: readonly HiveOperation[]): string {
  if (operations.length === 0) {
    throw new Error('No operations to broadcast');
  }
  const accounts = new Set<string>();
  for (const op of operations) {
    switch (op.type) {
      case 'vote':
        accounts.add(op.voter);
        break;
      case 'comment':
      case 'comment_options':
        accounts.add(op.author);
        break;
      case 'custom_json': {
        const posting = op.required_posting_auths[0];
        const active = op.required_auths[0];
        const primary = posting ?? active;
        if (primary == null || primary === '') {
          throw new Error('custom_json must set required_posting_auths or required_auths');
        }
        accounts.add(primary);
        break;
      }
      case 'reblog':
        accounts.add(op.account);
        break;
    }
  }
  if (accounts.size !== 1) {
    throw new Error('All operations must use the same signing account');
  }
  const [account] = accounts;
  if (account == null || account === '') {
    throw new Error('Signing account could not be resolved');
  }
  return account;
}

function toWireOperation(op: HiveOperation): KeychainWireOperation {
  switch (op.type) {
    case 'vote':
      return [
        'vote',
        {
          voter: op.voter,
          author: op.author,
          permlink: op.permlink,
          weight: op.weight,
        },
      ];
    case 'comment':
      return [
        'comment',
        {
          parent_author: op.parent_author,
          parent_permlink: op.parent_permlink,
          author: op.author,
          permlink: op.permlink,
          title: op.title,
          body: op.body,
          json_metadata: op.json_metadata,
        },
      ];
    case 'comment_options':
      return [
        'comment_options',
        {
          author: op.author,
          permlink: op.permlink,
          max_accepted_payout: op.max_accepted_payout,
          allow_votes: op.allow_votes,
          allow_curation_rewards: op.allow_curation_rewards,
          extensions: [...op.extensions],
        },
      ];
    case 'custom_json':
      return [
        'custom_json',
        {
          required_auths: [...op.required_auths],
          required_posting_auths: [...op.required_posting_auths],
          id: op.id,
          json: op.json,
        },
      ];
    case 'reblog':
      return [
        'reblog',
        {
          account: op.account,
          author: op.author,
          permlink: op.permlink,
        },
      ];
  }
}

function extractTransactionIdFromBroadcastResult(result: unknown): string | null {
  if (typeof result === 'string' && result.trim().length > 0) {
    return result.trim();
  }
  if (result && typeof result === 'object') {
    const o = result as Record<string, unknown>;
    const id = o.id ?? o.transaction_id ?? o.tx_id;
    if (typeof id === 'string' && id.trim().length > 0) {
      return id.trim();
    }
  }
  return null;
}

export function createKeychainSigner(): IHiveSigner {
  return {
    async sign(payload: HiveOperationPayload): Promise<BroadcastTransactionResult> {
      const win = window as HiveKeychainWindow;
      const kc = win.hive_keychain;
      if (!kc?.requestBroadcast) {
        throw new Error('Hive Keychain extension not found or requestBroadcast unavailable');
      }
      const account = resolveSigningAccount(payload.operations);
      const wireOps = payload.operations.map(toWireOperation);
      return new Promise((resolve, reject) => {
        kc.requestBroadcast(account, wireOps, 'Posting', (response) => {
          if (!response.success) {
            reject(new Error(response.error ?? 'Broadcast failed'));
            return;
          }
          const txId = extractTransactionIdFromBroadcastResult(response.result);
          if (!txId) {
            reject(new Error('Broadcast succeeded but transaction id missing'));
            return;
          }
          resolve({ transactionId: txId });
        });
      });
    },
  };
}
