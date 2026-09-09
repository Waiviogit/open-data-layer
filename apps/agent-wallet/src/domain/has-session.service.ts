import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildHasAuthDeepLink,
  encodeHasAuthCompactFragment,
  HasClient,
  HAS_SIGN_ACK_GRACE_MS,
  type HasSession,
  type HasTransportFactory,
} from '@opden-data-layer/hive-auth';
import {
  buildGalleryItemBroadcastOp,
  buildObjectCreateEnvelope,
  buildOdlBatchImportOp,
  buildOdlEnvelopeJson,
  buildValidatedUpdateCreateOp,
  exceedsHiveCustomJsonLimit,
  utf8ByteLength,
} from '@opden-data-layer/hive-broadcast';
import qrcode from 'qrcode';

import { AgentWalletAuthService } from '../auth/agent-wallet-auth.service';
import type { AgentWalletConfig } from '../config/agent-wallet.config';
import { LOGIN_REUSE_MIN_REMAINING_MS } from '../constants/login';
import { computeObjectCreateBroadcastMeta } from '../constants/broadcast-size';
import { LocalFilesService } from './local-files.service';
import {
  PendingRequestsStore,
  type BroadcastRequestState,
  type PendingLoginRequestState,
} from './pending-requests.store';
import { toHiveWireOperations } from './wire-operations';
import { HAS_TRANSPORT_FACTORY } from './has-transport.token';

type PersistedSession = HasSession;

/**
 * Deliberately free of `qrAscii` and of any JWT-shaped string: this payload is
 * what a chat agent relays to the user, and secret redactors cut `eyJ…` blobs.
 *
 * @see docs/skills/has-login-from-chat.md
 */
export type LoginStartResult = {
  requestId: string;
  alreadyActive: boolean;
  expiresAt: number;
  expiresInSec: number;
  pushSent: boolean;
  webLink?: string;
  deepLink?: string;
};

export type LoginStatusView =
  | {
      status: 'pending';
      account: string;
      expiresAt: number;
      expiresInSec: number;
      webLink?: string;
    }
  | { status: 'active'; account: string; expiresAt: number }
  | { status: 'rejected' }
  | { status: 'expired' };

export type LoginArtifacts = {
  account: string;
  deepLink: string;
  qrAscii: string;
  qrPngPath?: string;
};

@Injectable()
export class HasSessionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HasSessionService.name);
  private client: HasClient | null = null;
  private session: HasSession | null = null;
  private transportFactory?: HasTransportFactory;
  constructor(
    private readonly config: ConfigService<AgentWalletConfig, true>,
    private readonly auth: AgentWalletAuthService,
    private readonly files: LocalFilesService,
    private readonly pending: PendingRequestsStore,
    @Optional()
    @Inject(HAS_TRANSPORT_FACTORY)
    transportFactory?: HasTransportFactory,
  ) {
    this.transportFactory = transportFactory;
  }

  async onModuleInit(): Promise<void> {
    if (!this.config.get('persistSession', { infer: true })) {
      return;
    }

    const raw = await this.files.readTextFile(this.files.sessionPath());
    if (!raw?.trim()) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as PersistedSession;
      if (this.isSessionValid(parsed)) {
        this.session = parsed;
        this.logger.log(`Restored HAS session for @${parsed.username}`);
      } else {
        await this.files.deleteFile(this.files.sessionPath());
      }
    } catch (error) {
      this.logger.warn(
        `Could not restore session file: ${(error as Error).message}`,
      );
    }
  }

  onModuleDestroy(): void {
    this.client?.close();
    this.client = null;
  }

  getSessionInfo(): { account: string; expiresAt: number } | null {
    if (!this.session || !this.isSessionValid(this.session)) {
      return null;
    }
    return {
      account: this.session.username,
      expiresAt: this.session.expire,
    };
  }

  getRawSession(): HasSession | null {
    if (!this.session || !this.isSessionValid(this.session)) {
      return null;
    }
    return this.session;
  }

  getClientForChallenge(): HasClient | null {
    if (!this.session || !this.isSessionValid(this.session)) {
      return null;
    }
    return this.getOrCreateClient();
  }

  async loginStart(account: string): Promise<LoginStartResult> {
    const normalized = account.trim().replace(/^@/, '').toLowerCase();

    if (
      this.session &&
      this.isSessionValid(this.session) &&
      this.session.username === normalized
    ) {
      return {
        requestId: '',
        expiresAt: this.session.expire,
        alreadyActive: true,
        expiresInSec: this.secondsUntil(this.session.expire),
        pushSent: false,
      };
    }

    const reusable = this.findReusablePendingLogin(normalized);
    if (reusable) {
      return this.toLoginStartResult(reusable.requestId, reusable.state, false);
    }

    const staleSession = await this.loadStaleSession(normalized);
    if (staleSession?.token) {
      try {
        return await this.startLoginFlow(normalized, {
          token: staleSession.token,
          authKey: staleSession.key,
          pushSent: true,
        });
      } catch (error) {
        this.logger.warn(
          `Token re-auth failed for @${normalized}: ${(error as Error).message}`,
        );
      }
    }

    return this.startLoginFlow(normalized, { pushSent: false });
  }

  loginStatus(requestId: string): LoginStatusView {
    const state = this.pending.getLogin(requestId);
    if (!state) {
      return { status: 'expired' };
    }

    if (state.status === 'pending' && state.expiresAt <= Date.now()) {
      this.pending.updateLogin(requestId, { status: 'expired' });
      return { status: 'expired' };
    }

    if (state.status !== 'pending') {
      return state;
    }

    return {
      status: 'pending',
      account: state.account,
      expiresAt: state.expiresAt,
      expiresInSec: this.secondsUntil(state.expiresAt),
      ...(state.webLink ? { webLink: state.webLink } : {}),
    };
  }

  /**
   * Heavy artefacts kept out of the polled status: terminal QR and the
   * `has://` deep link are useless in chat and drown the tool response.
   */
  loginArtifacts(requestId: string): LoginArtifacts | null {
    const state = this.pending.getLogin(requestId);
    if (!state || state.status !== 'pending') {
      return null;
    }

    return {
      account: state.account,
      deepLink: state.deepLink,
      qrAscii: state.qrAscii,
      ...(state.qrPngPath ? { qrPngPath: state.qrPngPath } : {}),
    };
  }

  async logout(): Promise<void> {
    this.session = null;
    this.client?.close();
    this.client = null;
    if (this.config.get('persistSession', { infer: true })) {
      await this.files.deleteFile(this.files.sessionPath());
    }
  }

  buildObjectCreate(input: {
    objectType: string;
    objectId?: string;
    creator: string;
    fields: { updateType: string; value: unknown; locale?: string }[];
    language?: string;
  }): {
    ops: unknown[];
    opsCount: number;
    bytes: number;
    perOpBytes: number[];
    warnings: string[];
    suggestIpfsBatch: boolean;
    requiresIpfsBatch?: boolean;
    envelopeJson?: string;
  } {
    const creator = input.creator.trim().replace(/^@/, '').toLowerCase();
    const objectId =
      input.objectId?.trim() ||
      `${input.objectType}-${crypto.randomUUID().slice(0, 8)}`;

    const result = buildObjectCreateEnvelope({
      objectType: input.objectType,
      objectId,
      creator,
      id: this.config.get('odlCustomJsonId', { infer: true }),
      fields: input.fields,
      language: input.language,
    });

    if (result.requiresIpfsBatch) {
      const envelopeJson = buildOdlEnvelopeJson(result.events);
      return {
        ops: [],
        opsCount: 0,
        bytes: utf8ByteLength(envelopeJson),
        perOpBytes: [],
        warnings: result.warnings,
        suggestIpfsBatch: true,
        requiresIpfsBatch: true,
        envelopeJson,
      };
    }

    const meta = computeObjectCreateBroadcastMeta(result.ops, result.warnings);

    return {
      ops: result.ops,
      opsCount: meta.opsCount,
      bytes: meta.bytes,
      perOpBytes: meta.perOpBytes,
      warnings: meta.warnings,
      suggestIpfsBatch: meta.suggestIpfsBatch,
      requiresIpfsBatch: false,
    };
  }

  buildUpdateCreate(input: {
    objectId: string;
    creator: string;
    updateType: string;
    value: unknown;
    locale?: string;
    language?: string;
  }): {
    ops: unknown[];
    opsCount: number;
    bytes: number;
    requiresIpfsBatch?: boolean;
    envelopeJson?: string;
  } {
    const op = buildValidatedUpdateCreateOp({
      id: this.config.get('odlCustomJsonId', { infer: true }),
      objectId: input.objectId,
      creator: input.creator,
      updateType: input.updateType,
      value: input.value,
      locale: input.locale,
      language: input.language,
    });

    const bytes = utf8ByteLength(op.json);
    if (exceedsHiveCustomJsonLimit(op.json)) {
      return {
        ops: [],
        opsCount: 0,
        bytes,
        requiresIpfsBatch: true,
        envelopeJson: op.json,
      };
    }

    return {
      ops: [op],
      opsCount: 1,
      bytes,
      requiresIpfsBatch: false,
    };
  }

  buildBatchImport(input: { account: string; cid: string }): {
    ops: unknown[];
    opsCount: number;
    bytes: number;
  } {
    const account = input.account.trim().replace(/^@/, '').toLowerCase();
    const cid = input.cid.trim();
    const op = buildOdlBatchImportOp({
      id: this.config.get('odlCustomJsonId', { infer: true }),
      account,
      cid,
    });
    return this.singleOpBuildResult(op);
  }

  buildGalleryItem(input: {
    objectId: string;
    creator: string;
    itemValue: unknown;
    existingGalleryAlbumNames?: string[];
  }): {
    ops: unknown[];
    opsCount: number;
    bytes: number;
  } {
    const creator = input.creator.trim().replace(/^@/, '').toLowerCase();
    const op = buildGalleryItemBroadcastOp({
      id: this.config.get('odlCustomJsonId', { infer: true }),
      objectId: input.objectId.trim(),
      creator,
      itemValue: input.itemValue,
      onChainGalleryAlbumNames: input.existingGalleryAlbumNames ?? [],
    });

    return this.singleOpBuildResult(op);
  }

  private singleOpBuildResult(op: { json: string }): {
    ops: unknown[];
    opsCount: number;
    bytes: number;
  } {
    const bytes = utf8ByteLength(op.json);
    return {
      ops: [op],
      opsCount: 1,
      bytes,
    };
  }

  async broadcastStart(input: {
    ops: unknown[];
    keyType: 'posting' | 'active';
  }): Promise<{ requestId: string }> {
    if (!this.session || !this.isSessionValid(this.session)) {
      throw new Error('No active HAS session');
    }

    const requestId = this.auth.hashRequestId([
      'broadcast',
      this.session.username,
      String(Date.now()),
      crypto.randomUUID(),
    ]);

    const client = this.getOrCreateClient();
    const wireOps = toHiveWireOperations(input.ops);

    const signPending = await client.startBroadcast({
      session: this.session,
      keyType: input.keyType,
      ops: wireOps,
    });

    this.pending.setBroadcast(requestId, {
      status: 'pending',
      expiresAt: signPending.expire,
    });

    void this.awaitBroadcast(
      requestId,
      signPending.uuid,
      signPending.expire,
      client,
    ).catch(
      (error) => {
        this.logger.warn(
          `Broadcast flow ${requestId} failed: ${(error as Error).message}`,
        );
      },
    );

    return { requestId };
  }

  broadcastStatus(
    requestId: string,
  ): BroadcastRequestState | { status: 'expired' } {
    const state = this.pending.getBroadcast(requestId);
    if (!state) {
      return { status: 'expired' };
    }

    if (
      state.status === 'pending' &&
      state.expiresAt + HAS_SIGN_ACK_GRACE_MS <= Date.now()
    ) {
      this.pending.updateBroadcast(requestId, { status: 'expired' });
      return { status: 'expired' };
    }

    return state;
  }

  private secondsUntil(expiresAt: number): number {
    return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  }

  private async loadStaleSession(account: string): Promise<HasSession | null> {
    if (this.session?.username === account && this.session.token) {
      return this.session;
    }

    if (!this.config.get('persistSession', { infer: true })) {
      return null;
    }

    const raw = await this.files.readTextFile(this.files.sessionPath());
    if (!raw?.trim()) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as HasSession;
      if (parsed.username !== account || !parsed.token) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private findReusablePendingLogin(
    account: string,
  ): { requestId: string; state: PendingLoginRequestState } | null {
    const found = this.pending.findPendingLogin(account);
    if (!found) {
      return null;
    }
    if (found.state.expiresAt - Date.now() < LOGIN_REUSE_MIN_REMAINING_MS) {
      return null;
    }
    return found;
  }

  private toLoginStartResult(
    requestId: string,
    state: PendingLoginRequestState,
    pushSent: boolean,
  ): LoginStartResult {
    return {
      requestId,
      alreadyActive: false,
      expiresAt: state.expiresAt,
      expiresInSec: this.secondsUntil(state.expiresAt),
      pushSent,
      ...(state.webLink
        ? { webLink: state.webLink }
        : { deepLink: state.deepLink }),
    };
  }

  /**
   * The web link carries the compact fragment only. Falling back to the legacy
   * base64-of-JSON fragment would reintroduce the `eyJ…` prefix that chat
   * clients redact, so in that case no web link is offered at all.
   */
  private buildWebLink(payload: {
    account: string;
    uuid: string;
    key: string;
    host: string;
  }): string | undefined {
    const base = this.config.get('hasWebLinkBase', { infer: true });
    if (!base) {
      return undefined;
    }
    const fragment = encodeHasAuthCompactFragment(payload);
    if (!fragment) {
      this.logger.warn(
        'Could not build a compact HAS web link; falling back to deep link',
      );
      return undefined;
    }
    return `${base}/has#${fragment}`;
  }

  private async startLoginFlow(
    normalized: string,
    options: { token?: string; authKey?: string; pushSent: boolean },
  ): Promise<LoginStartResult> {
    const requestId = this.auth.hashRequestId([
      'login',
      normalized,
      String(Date.now()),
      crypto.randomUUID(),
    ]);

    const challenge = this.auth.createLoginChallenge(normalized);
    const client = this.getOrCreateClient();

    const pending = await client.startAuth({
      account: normalized,
      appMeta: {
        name: this.config.get('hasAppName', { infer: true }),
        description: 'ODL agent wallet',
      },
      challenge: {
        key_type: 'posting',
        challenge,
      },
      ...(options.token ? { token: options.token } : {}),
      ...(options.authKey ? { authKey: options.authKey } : {}),
    });

    const host = client.getHost().replace(/\/$/, '');
    const payload = {
      account: pending.account,
      uuid: pending.uuid,
      key: pending.authKey,
      host,
    };
    const deepLink = buildHasAuthDeepLink(payload);
    const webLink = this.buildWebLink(payload);

    const qrAscii = await qrcode.toString(deepLink, {
      type: 'terminal',
      small: true,
    });

    let qrPngPath: string | undefined;
    try {
      const png = await qrcode.toBuffer(deepLink, {
        type: 'png',
        width: 256,
        margin: 1,
      });
      const path = this.files.qrPath();
      await this.files.writeBinaryFile(path, png);
      qrPngPath = path;
    } catch (error) {
      this.logger.warn(
        `Could not write QR PNG: ${(error as Error).message}`,
      );
    }

    const loginState: PendingLoginRequestState = {
      status: 'pending',
      account: pending.account,
      deepLink,
      qrAscii,
      ...(webLink ? { webLink } : {}),
      ...(qrPngPath ? { qrPngPath } : {}),
      expiresAt: pending.expire,
    };
    this.pending.setLogin(requestId, loginState);

    void this.awaitLogin(requestId, pending.uuid, client).catch((error) => {
      this.logger.warn(
        `Login flow ${requestId} failed: ${(error as Error).message}`,
      );
    });

    return this.toLoginStartResult(requestId, loginState, options.pushSent);
  }

  private getOrCreateClient(): HasClient {
    if (!this.client) {
      this.client = new HasClient({
        host: this.config.get('hasWsUrl', { infer: true }),
        ...(this.transportFactory ? { transportFactory: this.transportFactory } : {}),
      });
    }
    return this.client;
  }

  private isSessionValid(session: HasSession): boolean {
    return session.expire > Date.now();
  }

  private async awaitLogin(
    requestId: string,
    uuid: string,
    client: HasClient,
  ): Promise<void> {
    try {
      const session = await client.awaitAuth(uuid);
      this.session = session;
      if (this.config.get('persistSession', { infer: true })) {
        await this.files.writeSecretFile(
          this.files.sessionPath(),
          `${JSON.stringify(session)}\n`,
        );
      }
      this.pending.updateLogin(requestId, {
        status: 'active',
        account: session.username,
        expiresAt: session.expire,
      });
    } catch (error) {
      const message = (error as Error).message;
      if (message === 'auth rejected') {
        this.pending.updateLogin(requestId, { status: 'rejected' });
        return;
      }
      if (message === 'expired') {
        this.pending.updateLogin(requestId, { status: 'expired' });
        return;
      }
      this.pending.updateLogin(requestId, { status: 'rejected' });
    }
  }

  private async awaitBroadcast(
    requestId: string,
    uuid: string,
    expireAt: number,
    client: HasClient,
  ): Promise<void> {
    if (!this.session) {
      this.pending.updateBroadcast(requestId, {
        status: 'error',
        message: 'No active HAS session',
      });
      return;
    }

    try {
      const result = await client.awaitBroadcast(uuid, this.session, expireAt);
      this.pending.updateBroadcast(requestId, {
        status: 'signed',
        transactionId: result.transactionId,
      });
    } catch (error) {
      const message = (error as Error).message;
      if (message === 'sign rejected') {
        this.pending.updateBroadcast(requestId, { status: 'rejected' });
        return;
      }
      if (message === 'expired') {
        this.pending.updateBroadcast(requestId, { status: 'expired' });
        return;
      }
      this.pending.updateBroadcast(requestId, {
        status: 'error',
        message,
      });
    }
  }
}
