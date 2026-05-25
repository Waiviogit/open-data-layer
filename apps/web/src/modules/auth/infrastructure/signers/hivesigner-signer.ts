'use client';

import { Client } from 'hivesigner';
import hivesigner from 'hivesigner';

import type { IHiveSigner } from '../../application/ports/hive-signer.port';
import {
  wireCommentOptionsPayload,
  type HiveOperation,
  type HiveOperationPayload,
} from '@opden-data-layer/hive-broadcast';
import type { BroadcastTransactionResult } from '../../domain/types';
import { getHivesignerToken } from '../hivesigner-token';

type WireOperation = [string, Record<string, unknown>];

const ACTIVE_KEY_OPERATIONS = new Set([
  'transfer',
  'transfer_to_vesting',
  'withdraw_vesting',
  'account_update',
  'account_update2',
  'convert',
  'limit_order_create',
  'limit_order_cancel',
]);

function assertNeverForHiveOp(x: never): never {
  throw new Error(`Unsupported Hive operation: ${JSON.stringify(x)}`);
}

function toWireOperation(op: HiveOperation): WireOperation {
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
      return ['comment_options', wireCommentOptionsPayload(op)];
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
  return assertNeverForHiveOp(op);
}

function requiresActiveKey(op: HiveOperation): boolean {
  if (op.type === 'custom_json') {
    return op.required_auths.length > 0;
  }
  return ACTIVE_KEY_OPERATIONS.has(op.type);
}

function extractTransactionIdFromBroadcastResult(result: unknown): string | null {
  if (typeof result === 'string' && result.trim().length > 0) {
    return result.trim();
  }
  if (result && typeof result === 'object') {
    const o = result as Record<string, unknown>;
    const nested = o.result;
    if (nested && typeof nested === 'object') {
      const nestedObj = nested as Record<string, unknown>;
      const nestedId = nestedObj.id ?? nestedObj.transaction_id ?? nestedObj.tx_id;
      if (typeof nestedId === 'string' && nestedId.trim().length > 0) {
        return nestedId.trim();
      }
    }
    const id = o.id ?? o.transaction_id ?? o.tx_id;
    if (typeof id === 'string' && id.trim().length > 0) {
      return id.trim();
    }
  }
  return null;
}

function redirectForActiveKeyOperations(wireOps: WireOperation[]): never {
  if (wireOps.length !== 1) {
    throw new Error('HiveSigner active-key signing supports one operation at a time');
  }

  const callbackUri = window.location.href;
  const [name, params] = wireOps[0];
  const signUrl = hivesigner.sign(
    name,
    params as Record<string, string | number | boolean>,
    callbackUri,
  );
  if (typeof signUrl !== 'string') {
    const err = signUrl as { error_description?: string; error?: string };
    throw new Error(err.error_description ?? err.error ?? 'HiveSigner sign URL failed');
  }
  window.location.assign(signUrl);
  throw new Error('HiveSigner redirect initiated');
}

export function createHiveSignerSigner(): IHiveSigner {
  return {
    async sign(payload: HiveOperationPayload): Promise<BroadcastTransactionResult> {
      const accessToken = getHivesignerToken();
      if (!accessToken) {
        throw new Error('HiveSigner access token missing — sign in again');
      }

      const wireOps = payload.operations.map(toWireOperation);
      const usesActiveKey = payload.operations.some(requiresActiveKey);

      if (usesActiveKey) {
        redirectForActiveKeyOperations(wireOps);
      }

      const client = new Client({ accessToken });
      const response = await client.broadcast(
        wireOps as Parameters<Client['broadcast']>[0],
      );
      const txId = extractTransactionIdFromBroadcastResult(response);
      if (!txId) {
        throw new Error('HiveSigner broadcast succeeded but transaction id missing');
      }
      return { transactionId: txId };
    },
  };
}
