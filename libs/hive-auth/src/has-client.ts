import { HAS_CMD, HAS_SUPPORTED_PROTOCOLS } from './has-cmd';

/** Extra window after HAS sign deadline for late SIGN_ACK (e.g. Keychain already broadcast). */
export const HAS_SIGN_ACK_GRACE_MS = 10_000;
import {
  decryptHasError,
  decryptHasPayload,
  encryptHasPayload,
} from './has-crypto';
import {
  createWsTransportFactory,
  type HasTransport,
  type HasTransportFactory,
} from './has-transport';

export type HasAppMeta = {
  name: string;
  description?: string;
  icon?: string;
};

export type HasChallengeData = {
  key_type: 'posting' | 'active' | 'memo';
  challenge: string;
};

export type HasChallengeProof = {
  pubkey: string;
  challenge: string;
};

export type HasServerInfo = {
  protocol: number;
  timeoutMs: number;
};

export type HasAuthPending = {
  uuid: string;
  expire: number;
  account: string;
  authKey: string;
};

export type HasSession = {
  username: string;
  key: string;
  expire: number;
  token?: string;
  host?: string;
  challengeProof?: HasChallengeProof;
};

export type HasSignPending = {
  uuid: string;
  expire: number;
};

type HasFrame = {
  cmd?: string;
  uuid?: string;
  expire?: number;
  account?: string;
  data?: string;
  error?: string;
  token?: string;
};

type AuthAckWaiter = {
  authKey: string;
  account: string;
  resolve: (session: HasSession) => void;
  reject: (error: Error) => void;
  expireAt: number;
  timeoutId: ReturnType<typeof setTimeout>;
};

type SignAckWaiter = {
  session: HasSession;
  resolve: (result: { transactionId: string }) => void;
  reject: (error: Error) => void;
  expireAt: number;
  timeoutId: ReturnType<typeof setTimeout>;
  inGrace?: boolean;
};

type ChallengeAckWaiter = {
  session: HasSession;
  resolve: (proof: HasChallengeProof) => void;
  reject: (error: Error) => void;
  expireAt: number;
  timeoutId: ReturnType<typeof setTimeout>;
};

type ChallengeWaitResolver = {
  resolve: (pending: HasSignPending) => void;
  reject: (error: Error) => void;
};

/** SIGN_ACK / SIGN_NACK / SIGN_ERR that arrived before awaitBroadcast registered. */
type EarlySignResult = {
  timeoutId: ReturnType<typeof setTimeout>;
  outcome:
    | { kind: 'ack'; transactionId: string }
    | { kind: 'nack' }
    | { kind: 'err'; error: string };
};

export type HasClientOptions = {
  host: string;
  transportFactory?: HasTransportFactory;
  now?: () => number;
};

export class HasClient {
  private readonly host: string;
  private readonly transportFactory: HasTransportFactory;
  private readonly now: () => number;

  private transport: HasTransport | null = null;
  private connected = false;
  private timeoutMs = 60_000;
  private connectPromise: Promise<HasServerInfo> | null = null;

  private authWaitResolvers: Array<{
    resolve: (pending: HasAuthPending) => void;
    reject: (error: Error) => void;
    account: string;
    authKey: string;
    timeoutId: ReturnType<typeof setTimeout>;
  }> = [];

  private readonly authAckWaiters = new Map<string, AuthAckWaiter>();
  private signWaitResolvers: ChallengeWaitResolver[] = [];
  private readonly signAckWaiters = new Map<string, SignAckWaiter>();
  private readonly earlySignResults = new Map<string, EarlySignResult>();
  private readonly challengeAckWaiters = new Map<string, ChallengeAckWaiter>();
  private readonly attachWaiters = new Map<
    string,
    {
      resolve: () => void;
      reject: (error: Error) => void;
      timeoutId: ReturnType<typeof setTimeout>;
    }
  >();

  constructor(options: HasClientOptions) {
    this.host = normalizeHasHost(options.host);
    this.transportFactory = options.transportFactory ?? createWsTransportFactory();
    this.now = options.now ?? (() => Date.now());
  }

  getHost(): string {
    return this.host;
  }

  async connect(): Promise<HasServerInfo> {
    if (this.connected) {
      return { protocol: 1, timeoutMs: this.timeoutMs };
    }
    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = this.doConnect();
    try {
      return await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  async startAuth(input: {
    account: string;
    appMeta: HasAppMeta;
    challenge?: HasChallengeData;
    token?: string;
    authKey?: string;
  }): Promise<HasAuthPending> {
    await this.connect();

    const account = normalizeAccount(input.account);
    const authKey = input.authKey ?? crypto.randomUUID();
    const data = encryptHasPayload(
      {
        app: input.appMeta,
        challenge: input.challenge,
      },
      authKey,
    );

    const pending = new Promise<HasAuthPending>((resolve, reject) => {
      const entry = {
        resolve,
        reject,
        account,
        authKey,
        timeoutId: setTimeout(() => {
          this.removeAuthWaitResolver(entry);
          reject(new Error('expired'));
        }, this.timeoutMs),
      };
      this.authWaitResolvers.push(entry);
    });

    this.transport?.send(
      JSON.stringify({
        cmd: HAS_CMD.AUTH_REQ,
        account,
        data,
        ...(input.token ? { token: input.token } : {}),
      }),
    );

    return pending;
  }

  async awaitAuth(uuid: string): Promise<HasSession> {
    const existing = this.authAckWaiters.get(uuid);
    if (!existing || !existing.authKey) {
      throw new Error(`No pending auth flow for uuid ${uuid}`);
    }

    return new Promise<HasSession>((resolve, reject) => {
      existing.resolve = resolve;
      existing.reject = reject;
    });
  }

  async startBroadcast(input: {
    session: HasSession;
    keyType: 'posting' | 'active';
    ops: unknown[];
  }): Promise<HasSignPending> {
    if (input.session.expire <= this.now()) {
      throw new Error('HAS session expired');
    }

    await this.connect();

    const data = encryptHasPayload(
      {
        key_type: input.keyType,
        ops: input.ops,
        broadcast: true,
        nonce: this.now(),
      },
      input.session.key,
    );

    const pending = new Promise<HasSignPending>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = this.signWaitResolvers.findIndex((r) => r.reject === reject);
        if (index >= 0) {
          this.signWaitResolvers.splice(index, 1);
        }
        reject(new Error('expired'));
      }, this.timeoutMs);

      this.signWaitResolvers.push({
        resolve: (signPending) => {
          clearTimeout(timeoutId);
          resolve(signPending);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
      });
    });

    this.transport?.send(
      JSON.stringify({
        cmd: HAS_CMD.SIGN_REQ,
        account: input.session.username,
        token: input.session.token,
        data,
      }),
    );

    return pending;
  }

  async startChallenge(input: {
    session: HasSession;
    challenge: HasChallengeData;
  }): Promise<HasSignPending> {
    if (input.session.expire <= this.now()) {
      throw new Error('HAS session expired');
    }

    await this.connect();

    const data = encryptHasPayload(
      {
        key_type: input.challenge.key_type,
        challenge: input.challenge.challenge,
        nonce: this.now(),
      },
      input.session.key,
    );

    const pending = new Promise<HasSignPending>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = this.signWaitResolvers.findIndex((r) => r.reject === reject);
        if (index >= 0) {
          this.signWaitResolvers.splice(index, 1);
        }
        reject(new Error('expired'));
      }, this.timeoutMs);

      this.signWaitResolvers.push({
        resolve: (challengePending) => {
          clearTimeout(timeoutId);
          resolve(challengePending);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
      });
    });

    this.transport?.send(
      JSON.stringify({
        cmd: HAS_CMD.CHALLENGE_REQ,
        account: input.session.username,
        data,
      }),
    );

    return pending;
  }

  async awaitChallenge(
    uuid: string,
    session: HasSession,
  ): Promise<HasChallengeProof> {
    const existing = this.challengeAckWaiters.get(uuid);
    if (existing) {
      return new Promise<HasChallengeProof>((resolve, reject) => {
        existing.resolve = resolve;
        existing.reject = reject;
      });
    }

    return new Promise<HasChallengeProof>((resolve, reject) => {
      const expireAt = this.now() + this.timeoutMs;
      const timeoutId = setTimeout(() => {
        this.challengeAckWaiters.delete(uuid);
        reject(new Error('expired'));
      }, Math.max(0, expireAt - this.now()));

      this.challengeAckWaiters.set(uuid, {
        session,
        resolve,
        reject,
        expireAt,
        timeoutId,
      });
    });
  }

  async awaitBroadcast(
    uuid: string,
    session: HasSession,
    expireAt: number,
  ): Promise<{ transactionId: string }> {
    const early = this.takeEarlySignResult(uuid);
    if (early) {
      return this.settleEarlySignResult(early, session);
    }

    const existing = this.signAckWaiters.get(uuid);
    if (existing) {
      return new Promise<{ transactionId: string }>((resolve, reject) => {
        existing.resolve = resolve;
        existing.reject = reject;
      });
    }

    return new Promise<{ transactionId: string }>((resolve, reject) => {
      const waiter: SignAckWaiter = {
        session,
        resolve,
        reject,
        expireAt,
        timeoutId: setTimeout(() => {
          /* replaced by armExpireTimer */
        }, 0),
      };

      const armExpireTimer = (deadline: number, inGrace: boolean): void => {
        clearTimeout(waiter.timeoutId);
        waiter.inGrace = inGrace;
        waiter.expireAt = deadline;
        waiter.timeoutId = setTimeout(() => {
          if (!waiter.inGrace) {
            armExpireTimer(deadline + HAS_SIGN_ACK_GRACE_MS, true);
            return;
          }
          this.signAckWaiters.delete(uuid);
          waiter.reject(new Error('expired'));
        }, Math.max(0, deadline - this.now()));
      };

      armExpireTimer(expireAt, false);
      this.signAckWaiters.set(uuid, waiter);
    });
  }

  close(): void {
    this.transport?.close();
    this.transport = null;
    this.connected = false;
    this.rejectAllPending(new Error('HAS client closed'));
  }

  private async doConnect(): Promise<HasServerInfo> {
    return new Promise<HasServerInfo>((resolve, reject) => {
      const transport = this.transportFactory(this.host);
      this.transport = transport;

      const fail = (error: Error): void => {
        transport.close();
        this.transport = null;
        this.connected = false;
        reject(error);
      };

      const connectedTimeout = setTimeout(() => {
        fail(new Error('Failed to connect to HiveAuth server'));
      }, this.timeoutMs);

      transport.onOpen(() => {
        // wait for connected frame
      });

      transport.onMessage((raw) => {
        let frame: HasFrame;
        try {
          frame = JSON.parse(raw) as HasFrame;
        } catch {
          return;
        }

        if (frame.cmd === HAS_CMD.CONNECTED) {
          clearTimeout(connectedTimeout);
          const protocol = frame as HasFrame & { protocol: number; timeout: number };
          if (!HAS_SUPPORTED_PROTOCOLS.includes(protocol.protocol as 0.8 | 1)) {
            fail(new Error('unsupported HAS protocol'));
            return;
          }
          this.timeoutMs = protocol.timeout * 1000;
          this.connected = true;
          resolve({
            protocol: protocol.protocol,
            timeoutMs: this.timeoutMs,
          });
          return;
        }

        if (!this.connected) {
          return;
        }

        this.handleFrame(frame);
      });

      transport.onClose(() => {
        this.connected = false;
      });
    });
  }

  private handleFrame(frame: HasFrame): void {
    switch (frame.cmd) {
      case HAS_CMD.AUTH_WAIT:
        this.handleAuthWait(frame);
        break;
      case HAS_CMD.AUTH_ACK:
        this.handleAuthAck(frame);
        break;
      case HAS_CMD.AUTH_NACK:
        this.handleAuthNack(frame);
        break;
      case HAS_CMD.AUTH_ERR:
        this.handleAuthErr(frame);
        break;
      case HAS_CMD.SIGN_WAIT:
        this.handleSignWait(frame);
        break;
      case HAS_CMD.SIGN_ACK:
        this.handleSignAck(frame);
        break;
      case HAS_CMD.SIGN_NACK:
        this.handleSignNack(frame);
        break;
      case HAS_CMD.SIGN_ERR:
        this.handleSignErr(frame);
        break;
      case HAS_CMD.CHALLENGE_WAIT:
        this.handleChallengeWait(frame);
        break;
      case HAS_CMD.CHALLENGE_ACK:
        this.handleChallengeAck(frame);
        break;
      case HAS_CMD.CHALLENGE_NACK:
        this.handleChallengeNack(frame);
        break;
      case HAS_CMD.CHALLENGE_ERR:
        this.handleChallengeErr(frame);
        break;
      case HAS_CMD.ATTACH_ACK:
        this.handleAttachAck(frame);
        break;
      case HAS_CMD.ATTACH_NACK:
        this.handleAttachNack(frame);
        break;
      case HAS_CMD.ERROR:
        this.handleGlobalError(frame);
        break;
      default:
        break;
    }
  }

  private handleAuthWait(frame: HasFrame): void {
    const resolver = this.authWaitResolvers.shift();
    if (!resolver || !frame.uuid || frame.expire == null) {
      return;
    }

    clearTimeout(resolver.timeoutId);

    const pending: HasAuthPending = {
      uuid: frame.uuid,
      expire: frame.expire,
      account: frame.account ?? resolver.account,
      authKey: resolver.authKey,
    };

    let ackWaiter = this.authAckWaiters.get(frame.uuid);
    if (!ackWaiter) {
      const expireAt = frame.expire;
      const timeoutId = setTimeout(() => {
        const waiter = this.authAckWaiters.get(frame.uuid!);
        if (waiter) {
          this.authAckWaiters.delete(frame.uuid!);
          waiter.reject(new Error('expired'));
        }
      }, Math.max(0, expireAt - this.now()));

      ackWaiter = {
        authKey: resolver.authKey,
        account: pending.account,
        resolve: () => undefined,
        reject: () => undefined,
        expireAt,
        timeoutId,
      };
      this.authAckWaiters.set(frame.uuid, ackWaiter);
    } else {
      ackWaiter.authKey = resolver.authKey;
      ackWaiter.account = pending.account;
      ackWaiter.expireAt = frame.expire;
    }

    resolver.resolve(pending);
  }

  private handleAuthAck(frame: HasFrame): void {
    if (!frame.uuid || !frame.data) {
      return;
    }

    const waiter = this.authAckWaiters.get(frame.uuid);
    if (!waiter) {
      return;
    }

    try {
      const data = decryptHasPayload<{
        token?: string;
        expire: number;
        challenge_data?: HasChallengeProof;
      }>(
        frame.data,
        waiter.authKey,
      );
      clearTimeout(waiter.timeoutId);
      this.authAckWaiters.delete(frame.uuid);

      const session: HasSession = {
        username: waiter.account,
        key: waiter.authKey,
        expire: data.expire,
        ...(typeof data.token === 'string' ? { token: data.token } : {}),
        host: stripTrailingSlash(this.host),
        ...(data.challenge_data ? { challengeProof: data.challenge_data } : {}),
      };

      waiter.resolve(session);
    } catch {
      // ignore undecryptable ack — wait for valid frame
    }
  }

  private handleAuthNack(frame: HasFrame): void {
    if (!frame.data) {
      return;
    }

    for (const [uuid, waiter] of this.authAckWaiters.entries()) {
      try {
        const decrypted = decryptHasError(frame.data, waiter.authKey);
        if (decrypted === uuid) {
          clearTimeout(waiter.timeoutId);
          this.authAckWaiters.delete(uuid);
          waiter.reject(new Error('auth rejected'));
          return;
        }
      } catch {
        // try next waiter
      }
    }
  }

  private handleAuthErr(frame: HasFrame): void {
    const resolver = this.authWaitResolvers.shift();
    if (resolver) {
      clearTimeout(resolver.timeoutId);
      resolver.reject(new Error('auth error'));
      return;
    }

    if (frame.uuid) {
      const waiter = this.authAckWaiters.get(frame.uuid);
      if (waiter) {
        clearTimeout(waiter.timeoutId);
        this.authAckWaiters.delete(frame.uuid);
        waiter.reject(new Error('auth error'));
      }
    }
  }

  private handleSignWait(frame: HasFrame): void {
    const resolver = this.signWaitResolvers.shift();
    if (!resolver || !frame.uuid || frame.expire == null) {
      return;
    }

    resolver.resolve({
      uuid: frame.uuid,
      expire: frame.expire,
    });
  }

  private handleSignAck(frame: HasFrame): void {
    if (!frame.uuid) {
      return;
    }

    const waiter = this.signAckWaiters.get(frame.uuid);
    const transactionId =
      typeof frame.data === 'string' && frame.data.length > 0
        ? frame.data
        : '';

    if (!waiter) {
      this.bufferEarlySignResult(frame.uuid, {
        kind: 'ack',
        transactionId,
      });
      return;
    }

    clearTimeout(waiter.timeoutId);
    this.signAckWaiters.delete(frame.uuid);
    waiter.resolve({ transactionId });
  }

  private handleSignNack(frame: HasFrame): void {
    if (!frame.uuid) {
      return;
    }

    const waiter = this.signAckWaiters.get(frame.uuid);
    if (!waiter) {
      this.bufferEarlySignResult(frame.uuid, { kind: 'nack' });
      return;
    }

    clearTimeout(waiter.timeoutId);
    this.signAckWaiters.delete(frame.uuid);
    waiter.reject(new Error('sign rejected'));
  }

  private handleSignErr(frame: HasFrame): void {
    if (!frame.uuid || !frame.error) {
      return;
    }

    const waiter = this.signAckWaiters.get(frame.uuid);
    if (!waiter) {
      this.bufferEarlySignResult(frame.uuid, {
        kind: 'err',
        error: frame.error,
      });
      return;
    }

    try {
      const message = decryptHasError(frame.error, waiter.session.key);
      clearTimeout(waiter.timeoutId);
      this.signAckWaiters.delete(frame.uuid);
      waiter.reject(new Error(message));
    } catch {
      clearTimeout(waiter.timeoutId);
      this.signAckWaiters.delete(frame.uuid);
      waiter.reject(new Error('sign error'));
    }
  }

  private handleChallengeWait(frame: HasFrame): void {
    const resolver = this.signWaitResolvers.shift();
    if (!resolver || !frame.uuid || frame.expire == null) {
      return;
    }

    resolver.resolve({
      uuid: frame.uuid,
      expire: frame.expire,
    });
  }

  private handleChallengeAck(frame: HasFrame): void {
    if (!frame.uuid || !frame.data) {
      return;
    }

    const waiter = this.challengeAckWaiters.get(frame.uuid);
    if (!waiter) {
      return;
    }

    try {
      const proof = decryptHasPayload<HasChallengeProof>(
        frame.data,
        waiter.session.key,
      );
      if (!proof.pubkey || !proof.challenge) {
        return;
      }
      clearTimeout(waiter.timeoutId);
      this.challengeAckWaiters.delete(frame.uuid);
      waiter.resolve(proof);
    } catch {
      // ignore undecryptable ack
    }
  }

  private handleChallengeNack(frame: HasFrame): void {
    if (!frame.uuid) {
      return;
    }

    const waiter = this.challengeAckWaiters.get(frame.uuid);
    if (!waiter) {
      return;
    }

    clearTimeout(waiter.timeoutId);
    this.challengeAckWaiters.delete(frame.uuid);
    waiter.reject(new Error('challenge rejected'));
  }

  private handleChallengeErr(frame: HasFrame): void {
    if (!frame.uuid) {
      return;
    }

    const waiter = this.challengeAckWaiters.get(frame.uuid);
    if (!waiter) {
      return;
    }

    clearTimeout(waiter.timeoutId);
    this.challengeAckWaiters.delete(frame.uuid);
    waiter.reject(new Error('challenge error'));
  }

  private handleAttachAck(frame: HasFrame): void {
    if (!frame.uuid) {
      return;
    }
    const waiter = this.attachWaiters.get(frame.uuid);
    if (!waiter) {
      return;
    }
    clearTimeout(waiter.timeoutId);
    this.attachWaiters.delete(frame.uuid);
    waiter.resolve();
  }

  private handleAttachNack(frame: HasFrame): void {
    if (!frame.uuid) {
      return;
    }
    const waiter = this.attachWaiters.get(frame.uuid);
    if (!waiter) {
      return;
    }
    clearTimeout(waiter.timeoutId);
    this.attachWaiters.delete(frame.uuid);
    waiter.reject(new Error('attach rejected'));
  }

  private handleGlobalError(_frame: HasFrame): void {
    const authResolver = this.authWaitResolvers.shift();
    if (authResolver) {
      clearTimeout(authResolver.timeoutId);
      authResolver.reject(new Error('HAS error'));
      return;
    }

    const signResolver = this.signWaitResolvers.shift();
    if (signResolver) {
      signResolver.reject(new Error('HAS error'));
    }
  }

  async attachPending(uuid: string): Promise<void> {
    await this.connect();

    return new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.attachWaiters.delete(uuid);
        reject(new Error('expired'));
      }, this.timeoutMs);

      this.attachWaiters.set(uuid, { resolve, reject, timeoutId });

      this.transport?.send(
        JSON.stringify({
          cmd: HAS_CMD.ATTACH_REQ,
          uuid,
        }),
      );
    });
  }

  private bufferEarlySignResult(
    uuid: string,
    outcome: EarlySignResult['outcome'],
  ): void {
    const previous = this.earlySignResults.get(uuid);
    if (previous) {
      clearTimeout(previous.timeoutId);
    }

    const timeoutId = setTimeout(() => {
      this.earlySignResults.delete(uuid);
    }, this.timeoutMs);

    this.earlySignResults.set(uuid, { timeoutId, outcome });
  }

  private takeEarlySignResult(
    uuid: string,
  ): EarlySignResult['outcome'] | undefined {
    const early = this.earlySignResults.get(uuid);
    if (!early) {
      return undefined;
    }

    clearTimeout(early.timeoutId);
    this.earlySignResults.delete(uuid);
    return early.outcome;
  }

  private settleEarlySignResult(
    outcome: EarlySignResult['outcome'],
    session: HasSession,
  ): { transactionId: string } {
    if (outcome.kind === 'ack') {
      return { transactionId: outcome.transactionId };
    }

    if (outcome.kind === 'nack') {
      throw new Error('sign rejected');
    }

    let message = 'sign error';
    try {
      message = decryptHasError(outcome.error, session.key);
    } catch {
      message = 'sign error';
    }
    throw new Error(message);
  }

  private removeAuthWaitResolver(
    entry: (typeof this.authWaitResolvers)[number],
  ): void {
    this.authWaitResolvers = this.authWaitResolvers.filter((r) => r !== entry);
  }

  private rejectAllPending(error: Error): void {
    for (const resolver of this.authWaitResolvers) {
      clearTimeout(resolver.timeoutId);
      resolver.reject(error);
    }
    this.authWaitResolvers = [];

    for (const resolver of this.signWaitResolvers) {
      resolver.reject(error);
    }
    this.signWaitResolvers = [];

    for (const [uuid, waiter] of this.authAckWaiters.entries()) {
      clearTimeout(waiter.timeoutId);
      waiter.reject(error);
      this.authAckWaiters.delete(uuid);
    }

    for (const [uuid, waiter] of this.signAckWaiters.entries()) {
      clearTimeout(waiter.timeoutId);
      waiter.reject(error);
      this.signAckWaiters.delete(uuid);
    }

    for (const [uuid, early] of this.earlySignResults.entries()) {
      clearTimeout(early.timeoutId);
      this.earlySignResults.delete(uuid);
    }

    for (const [uuid, waiter] of this.challengeAckWaiters.entries()) {
      clearTimeout(waiter.timeoutId);
      waiter.reject(error);
      this.challengeAckWaiters.delete(uuid);
    }

    for (const [uuid, waiter] of this.attachWaiters.entries()) {
      clearTimeout(waiter.timeoutId);
      waiter.reject(error);
      this.attachWaiters.delete(uuid);
    }
  }
}

function normalizeAccount(account: string): string {
  return account.trim().replace(/^@/, '').toLowerCase();
}

function normalizeHasHost(host: string): string {
  const trimmed = host.trim();
  if (!trimmed.match(/^wss?:\/\//)) {
    throw new Error('invalid HAS host URL');
  }
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

function stripTrailingSlash(host: string): string {
  return host.endsWith('/') ? host.slice(0, -1) : host;
}
