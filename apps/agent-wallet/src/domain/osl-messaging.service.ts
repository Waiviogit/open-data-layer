import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  computeActivityFingerprint,
  formatPHashHex,
  normalizeOriginalText,
} from '@opden-data-layer/core';
import {
  buildEncryptedMessageCreatePayload,
  buildGroupChannelCreatePayload,
  buildMessageCreatePayload,
  buildMessageDeletePayload,
  buildMessageUpdatePayload,
  buildObjectChannelCreatePayload,
  buildOslChannelCreateOp,
  buildOslMessageCreateOp,
  buildOslMessageDeleteOp,
  buildOslMessageUpdateOp,
  generateGroupChannelId,
} from '@opden-data-layer/hive-broadcast';
import {
  createMemoCryptoOperations,
  type EncryptionMode,
} from '@opden-data-layer/hive-memo-crypto';

import type { AgentWalletConfig } from '../config/agent-wallet.config';
import { normalizeHiveAccount } from '../utils/hive-account';
import { LocalKeysService } from './local-keys.service';

type BuildResult = {
  ops: unknown[];
  opsCount: number;
  bytes: number;
  warnings?: string[];
};

@Injectable()
export class OslMessagingService {
  private readonly memoCrypto = createMemoCryptoOperations();

  constructor(
    private readonly config: ConfigService<AgentWalletConfig, true>,
    private readonly localKeys: LocalKeysService,
  ) {}

  buildChannelCreate(input: {
    kind: 'group' | 'object';
    creator: string;
    channelId?: string;
    members?: readonly string[];
    objectId?: string;
    title?: string;
  }): BuildResult {
    const creator = normalizeHiveAccount(input.creator);
    const channelId =
      input.channelId?.trim() ||
      (input.kind === 'group' ? generateGroupChannelId() : undefined);

    let payload: Record<string, unknown>;
    if (input.kind === 'group') {
      if (!channelId) {
        throw new Error('channelId is required for group channels');
      }
      payload = buildGroupChannelCreatePayload({
        channelId,
        members: input.members ?? [],
        title: input.title,
        viewerUsername: creator,
      });
    } else {
      const objectId = input.objectId?.trim();
      if (!objectId) {
        throw new Error('objectId is required for object channels');
      }
      payload = buildObjectChannelCreatePayload({
        objectId,
        objectName: input.title,
      });
    }

    const op = buildOslChannelCreateOp({
      id: this.config.get('oslCustomJsonId', { infer: true }),
      creator,
      payload,
    });
    return this.singleOpBuildResult(op);
  }

  activityFingerprint(originalText: string): {
    v: number;
    textSimhash: string | null;
    normalizedLength: number;
    normalizedPreview: string;
  } {
    const computed = computeActivityFingerprint(originalText);
    const normalized = normalizeOriginalText(originalText);
    return {
      v: computed.v,
      textSimhash:
        computed.textSimhash != null ? formatPHashHex(computed.textSimhash) : null,
      normalizedLength: computed.normalizedLength,
      normalizedPreview: normalized.slice(0, 120),
    };
  }

  buildMessageCreate(input: {
    creator: string;
    channelId?: string;
    peer?: string;
    body: string;
    originalCreatedAtUnix?: number | null;
    replyTo?: string;
    quoteJson?: { author: string; body: string };
    source?: {
      platform: string;
      id: string;
      fpV?: number;
      textSimhash?: string | null;
      imagePHashes?: string[];
    };
  }): BuildResult {
    const creator = normalizeHiveAccount(input.creator);
    const payload = buildMessageCreatePayload({
      channelId: input.channelId,
      peer: input.peer,
      body: input.body,
      originalCreatedAtUnix: input.originalCreatedAtUnix,
      replyTo: input.replyTo,
      quoteJson: input.quoteJson,
      source: input.source,
    });
    const op = buildOslMessageCreateOp({
      id: this.config.get('oslCustomJsonId', { infer: true }),
      creator,
      payload,
    });
    return this.singleOpBuildResult(op);
  }

  buildMessageUpdate(input: {
    creator: string;
    channelId: string;
    messageId: string;
    body: string;
  }): BuildResult {
    const creator = normalizeHiveAccount(input.creator);
    const payload = buildMessageUpdatePayload({
      channelId: input.channelId,
      messageId: input.messageId,
      body: input.body,
    });
    const op = buildOslMessageUpdateOp({
      id: this.config.get('oslCustomJsonId', { infer: true }),
      creator,
      payload,
    });
    return this.singleOpBuildResult(op);
  }

  buildMessageDelete(input: {
    creator: string;
    channelId: string;
    messageId: string;
  }): BuildResult {
    const creator = normalizeHiveAccount(input.creator);
    const payload = buildMessageDeletePayload({
      channelId: input.channelId,
      messageId: input.messageId,
    });
    const op = buildOslMessageDeleteOp({
      id: this.config.get('oslCustomJsonId', { infer: true }),
      creator,
      payload,
    });
    return this.singleOpBuildResult(op);
  }

  async buildEncryptedMessageCreate(input: {
    creator: string;
    channelId?: string;
    peer?: string;
    recipient: string;
    plaintext: string;
    mode: EncryptionMode;
  }): Promise<BuildResult> {
    this.assertEncryptedBuildAllowed(input.mode, input.creator);
    const recipientMemoPublic = await this.fetchMemoPublicKey(input.recipient);
    const { ciphertext, mode } = await this.memoEncrypt({
      recipientMemoPublic,
      plaintext: input.plaintext,
      mode: input.mode,
      account: input.creator,
    });
    const creator = normalizeHiveAccount(input.creator);
    const payload = buildEncryptedMessageCreatePayload({
      channelId: input.channelId,
      peer: input.peer,
      ciphertext,
      mode,
      to: normalizeHiveAccount(input.recipient),
    });
    const op = buildOslMessageCreateOp({
      id: this.config.get('oslCustomJsonId', { infer: true }),
      creator,
      payload,
    });
    return this.singleOpBuildResult(op);
  }

  async memoEncrypt(input: {
    recipientMemoPublic: string;
    plaintext: string;
    mode: EncryptionMode;
    account?: string;
  }): Promise<{ ciphertext: string; mode: EncryptionMode }> {
    const account = input.account?.trim()
      ? normalizeHiveAccount(input.account)
      : undefined;
    if (input.mode === 'memo' && !this.localKeys.isMemoReady(account)) {
      throw new Error('Memo key is required for memo mode encryption');
    }
    return this.memoCrypto.encryptForRecipient({
      senderMemoPrivateWif:
        input.mode === 'memo'
          ? this.localKeys.getMemoPrivateKey(account).toString()
          : undefined,
      recipientMemoPublic: input.recipientMemoPublic,
      plaintext: input.plaintext,
      mode: input.mode,
    });
  }

  memoDecrypt(input: { ciphertext: string; account?: string }): string {
    const account = input.account?.trim()
      ? normalizeHiveAccount(input.account)
      : undefined;
    if (!this.localKeys.isMemoReady(account)) {
      throw new Error('Memo key is required for decryption');
    }
    return this.memoCrypto.decrypt({
      recipientMemoPrivateWif: this.localKeys.getMemoPrivateKey(account).toString(),
      ciphertext: input.ciphertext,
    });
  }

  async fetchMemoPublicKey(account: string): Promise<string> {
    const normalized = normalizeHiveAccount(account);
    const accounts = await this.localKeys.getRpcClient().database.getAccounts([
      normalized,
    ]);
    const row = accounts[0];
    if (!row?.memo_key) {
      throw new Error(`Account not found or missing memo key: ${normalized}`);
    }
    return String(row.memo_key);
  }

  assertEncryptedBuildAllowed(mode: EncryptionMode, creator?: string): void {
    const account = creator?.trim()
      ? normalizeHiveAccount(creator)
      : this.config.get('defaultAccount', { infer: true });
    if (!account || !this.localKeys.hasAccount(account)) {
      throw new Error(
        'Encrypted OSL messages require a locally configured account with memo key support',
      );
    }
    if (mode === 'memo' && !this.localKeys.isMemoReady(account)) {
      throw new Error('Memo key is not configured or invalid for the creator account');
    }
  }

  private singleOpBuildResult(op: { json: string }): BuildResult {
    const bytes = new TextEncoder().encode(op.json).length;
    return {
      ops: [op],
      opsCount: 1,
      bytes,
    };
  }
}
