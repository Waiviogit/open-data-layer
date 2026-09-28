import CryptoJS from 'crypto-js';

import { HAS_CMD } from './has-cmd';
import { encryptHasPayload } from './has-crypto';
import { buildHasAuthDeepLink } from './has-deep-link';
import { HAS_SIGN_ACK_GRACE_MS, HasClient } from './has-client';
import type { HasTransport, HasTransportFactory } from './has-transport';

class FakeHasTransport implements HasTransport {
  readyState = 1;
  protected messageHandler: ((data: string) => void) | null = null;
  private openHandler: (() => void) | null = null;
  private closeHandler: (() => void) | null = null;
  private connectedEmitted = false;
  readonly sent: string[] = [];

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = 3;
    this.closeHandler?.();
  }

  onMessage(handler: (data: string) => void): void {
    this.messageHandler = handler;
    if (!this.connectedEmitted) {
      this.connectedEmitted = true;
      handler(
        JSON.stringify({
          cmd: HAS_CMD.CONNECTED,
          protocol: 1,
          timeout: 60,
        }),
      );
    }
  }

  onOpen(handler: () => void): void {
    this.openHandler = handler;
    handler();
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler;
  }

  emit(frame: unknown): void {
    this.messageHandler?.(JSON.stringify(frame));
  }
}

function createFakeFactory(transport: FakeHasTransport): HasTransportFactory {
  return () => transport;
}

async function connectClient(
  transport: FakeHasTransport,
  now: () => number = () => 1_000,
): Promise<HasClient> {
  const client = new HasClient({
    host: 'wss://hive-auth.test/',
    transportFactory: createFakeFactory(transport),
    now,
  });
  await client.connect();
  return client;
}

describe('HasClient', () => {
  let activeClient: HasClient | null = null;

  afterEach(() => {
    activeClient?.close();
    activeClient = null;
    jest.useRealTimers();
  });

  async function openClient(
    transport: FakeHasTransport,
    now: () => number = () => 1_000,
  ): Promise<HasClient> {
    const client = await connectClient(transport, now);
    activeClient = client;
    return client;
  }
  it('rejects connect when HAS protocol is unsupported', async () => {
    class UnsupportedProtocolTransport extends FakeHasTransport {
      override onMessage(handler: (data: string) => void): void {
        this.messageHandler = handler;
        handler(
          JSON.stringify({
            cmd: HAS_CMD.CONNECTED,
            protocol: 2,
            timeout: 60,
          }),
        );
      }
    }

    const transport = new UnsupportedProtocolTransport();
    const client = new HasClient({
      host: 'wss://hive-auth.test/',
      transportFactory: createFakeFactory(transport),
    });

    await expect(client.connect()).rejects.toThrow('unsupported HAS protocol');
    expect(transport.sent).toHaveLength(0);
  });

  it('encrypts auth_req body with returned auth key', async () => {
    const transport = new FakeHasTransport();
    const client = await openClient(transport);

    const startPromise = client.startAuth({
      account: 'alice',
      appMeta: { name: 'ODL' },
      challenge: { key_type: 'posting', challenge: 'c1' },
    });
    await Promise.resolve();

    const authWaitFrame = JSON.parse(transport.sent[0]!) as {
      cmd: string;
      account: string;
      data: string;
      auth_key?: string;
    };

    expect(authWaitFrame.cmd).toBe(HAS_CMD.AUTH_REQ);
    expect(authWaitFrame.account).toBe('alice');
    expect(authWaitFrame.auth_key).toBeUndefined();

    transport.emit({
      cmd: HAS_CMD.AUTH_WAIT,
      uuid: 'u1',
      expire: 2_000,
      account: 'alice',
    });

    const pending = await startPromise;
    const decrypted = JSON.parse(
      CryptoJS.AES.decrypt(authWaitFrame.data, pending.authKey).toString(
        CryptoJS.enc.Utf8,
      ),
    );

    expect(decrypted).toEqual({
      app: { name: 'ODL' },
      challenge: { key_type: 'posting', challenge: 'c1' },
    });
    expect(pending.uuid).toBe('u1');
  });

  it('includes token on auth_req when provided', async () => {
    const transport = new FakeHasTransport();
    const client = await openClient(transport);

    const startPromise = client.startAuth({
      account: 'alice',
      appMeta: { name: 'ODL' },
      token: 'stored-token',
      authKey: 'fixed-auth-key',
    });
    await Promise.resolve();

    const authReqFrame = JSON.parse(transport.sent[0]!) as {
      cmd: string;
      token?: string;
    };
    expect(authReqFrame.token).toBe('stored-token');

    transport.emit({
      cmd: HAS_CMD.AUTH_WAIT,
      uuid: 'u-token',
      expire: 2_000,
      account: 'alice',
    });

    const pending = await startPromise;
    expect(pending.authKey).toBe('fixed-auth-key');
    expect(pending.uuid).toBe('u-token');
  });

  it('returns session from decrypted auth_ack', async () => {
    const transport = new FakeHasTransport();
    const client = await openClient(transport);

    const startPromise = client.startAuth({
      account: 'alice',
      appMeta: { name: 'ODL' },
    });
    await Promise.resolve();

    transport.emit({
      cmd: HAS_CMD.AUTH_WAIT,
      uuid: 'u1',
      expire: 9_000,
      account: 'alice',
    });

    const pending = await startPromise;
    const authPromise = client.awaitAuth(pending.uuid);

    transport.emit({
      cmd: HAS_CMD.AUTH_ACK,
      uuid: 'u1',
      data: encryptHasPayload(
        { token: 't1', expire: 1_900_000_000_000 },
        pending.authKey,
      ),
    });

    await expect(authPromise).resolves.toEqual({
      username: 'alice',
      key: pending.authKey,
      token: 't1',
      expire: 1_900_000_000_000,
      host: 'wss://hive-auth.test',
    });
  });

  it('rejects auth when user rejects on device', async () => {
    const transport = new FakeHasTransport();
    const client = await openClient(transport);

    const startPromise = client.startAuth({
      account: 'alice',
      appMeta: { name: 'ODL' },
    });
    await Promise.resolve();

    transport.emit({
      cmd: HAS_CMD.AUTH_WAIT,
      uuid: 'u1',
      expire: 9_000,
      account: 'alice',
    });

    const pending = await startPromise;
    const authPromise = client.awaitAuth(pending.uuid);

    transport.emit({
      cmd: HAS_CMD.AUTH_NACK,
      uuid: 'u1',
      data: CryptoJS.AES.encrypt('u1', pending.authKey).toString(),
    });

    await expect(authPromise).rejects.toThrow('auth rejected');
  });

  it('returns transaction id from sign_ack', async () => {
    const transport = new FakeHasTransport();
    const client = await openClient(transport);

    const session = {
      username: 'alice',
      key: 'k1',
      token: 't1',
      expire: 9_000,
    };

    const startPromise = client.startBroadcast({
      session,
      keyType: 'posting',
      ops: [['custom_json', { id: 'odl-testnet', json: '{}' }]],
    });
    await Promise.resolve();

    transport.emit({
      cmd: HAS_CMD.SIGN_WAIT,
      uuid: 's1',
      expire: 9_000,
    });

    const signPending = await startPromise;
    const ackPromise = client.awaitBroadcast(
      signPending.uuid,
      session,
      signPending.expire,
    );

    transport.emit({
      cmd: HAS_CMD.SIGN_ACK,
      uuid: 's1',
      data: 'trx-abc',
    });

    await expect(ackPromise).resolves.toEqual({ transactionId: 'trx-abc' });
  });

  it('rejects broadcast when user rejects on device', async () => {
    const transport = new FakeHasTransport();
    const client = await openClient(transport);

    const session = {
      username: 'alice',
      key: 'k1',
      token: 't1',
      expire: 9_000,
    };

    const startPromise = client.startBroadcast({
      session,
      keyType: 'posting',
      ops: [['vote', {}]],
    });
    await Promise.resolve();

    transport.emit({
      cmd: HAS_CMD.SIGN_WAIT,
      uuid: 's1',
      expire: 9_000,
    });

    const signPending = await startPromise;
    const ackPromise = client.awaitBroadcast(
      signPending.uuid,
      session,
      signPending.expire,
    );

    transport.emit({ cmd: HAS_CMD.SIGN_NACK, uuid: 's1' });

    await expect(ackPromise).rejects.toThrow('sign rejected');
  });

  it('keeps sign_ack that arrives before awaitBroadcast', async () => {
    const transport = new FakeHasTransport();
    const client = await openClient(transport);

    const session = {
      username: 'alice',
      key: 'k1',
      token: 't1',
      expire: 9_000,
    };

    const startPromise = client.startBroadcast({
      session,
      keyType: 'posting',
      ops: [['custom_json', { id: 'odl-testnet', json: '{}' }]],
    });
    await Promise.resolve();

    transport.emit({
      cmd: HAS_CMD.SIGN_WAIT,
      uuid: 's1',
      expire: 9_000,
    });
    transport.emit({
      cmd: HAS_CMD.SIGN_ACK,
      uuid: 's1',
      data: 'trx-abc',
    });

    const signPending = await startPromise;
    await expect(
      client.awaitBroadcast(signPending.uuid, session, signPending.expire),
    ).resolves.toEqual({ transactionId: 'trx-abc' });
  });

  it('keeps sign_nack that arrives before awaitBroadcast', async () => {
    const transport = new FakeHasTransport();
    const client = await openClient(transport);

    const session = {
      username: 'alice',
      key: 'k1',
      token: 't1',
      expire: 9_000,
    };

    const startPromise = client.startBroadcast({
      session,
      keyType: 'posting',
      ops: [['vote', {}]],
    });
    await Promise.resolve();

    transport.emit({
      cmd: HAS_CMD.SIGN_WAIT,
      uuid: 's1',
      expire: 9_000,
    });
    transport.emit({ cmd: HAS_CMD.SIGN_NACK, uuid: 's1' });

    const signPending = await startPromise;
    await expect(
      client.awaitBroadcast(signPending.uuid, session, signPending.expire),
    ).rejects.toThrow('sign rejected');
  });

  it('keeps sign_err that arrives before awaitBroadcast', async () => {
    const transport = new FakeHasTransport();
    const client = await openClient(transport);

    const session = {
      username: 'alice',
      key: 'k1',
      token: 't1',
      expire: 9_000,
    };

    const startPromise = client.startBroadcast({
      session,
      keyType: 'posting',
      ops: [['vote', {}]],
    });
    await Promise.resolve();

    transport.emit({
      cmd: HAS_CMD.SIGN_WAIT,
      uuid: 's1',
      expire: 9_000,
    });
    transport.emit({
      cmd: HAS_CMD.SIGN_ERR,
      uuid: 's1',
      error: CryptoJS.AES.encrypt('insufficient RC', 'k1').toString(),
    });

    const signPending = await startPromise;
    await expect(
      client.awaitBroadcast(signPending.uuid, session, signPending.expire),
    ).rejects.toThrow('insufficient RC');
  });

  it('decrypts sign_err message', async () => {
    const transport = new FakeHasTransport();
    const client = await openClient(transport);

    const session = {
      username: 'alice',
      key: 'k1',
      token: 't1',
      expire: 9_000,
    };

    const startPromise = client.startBroadcast({
      session,
      keyType: 'posting',
      ops: [['vote', {}]],
    });
    await Promise.resolve();

    transport.emit({
      cmd: HAS_CMD.SIGN_WAIT,
      uuid: 's1',
      expire: 9_000,
    });

    const signPending = await startPromise;
    const ackPromise = client.awaitBroadcast(
      signPending.uuid,
      session,
      signPending.expire,
    );

    transport.emit({
      cmd: HAS_CMD.SIGN_ERR,
      uuid: 's1',
      error: CryptoJS.AES.encrypt('insufficient RC', 'k1').toString(),
    });

    await expect(ackPromise).rejects.toThrow('insufficient RC');
  });

  it('does not mix parallel broadcast results', async () => {
    const transport = new FakeHasTransport();
    const client = await openClient(transport);

    const session = {
      username: 'alice',
      key: 'k1',
      token: 't1',
      expire: 9_000,
    };

    const firstStart = client.startBroadcast({
      session,
      keyType: 'posting',
      ops: [['vote', { id: 1 }]],
    });
    const secondStart = client.startBroadcast({
      session,
      keyType: 'posting',
      ops: [['vote', { id: 2 }]],
    });
    await Promise.resolve();

    transport.emit({ cmd: HAS_CMD.SIGN_WAIT, uuid: 's1', expire: 9_000 });
    transport.emit({ cmd: HAS_CMD.SIGN_WAIT, uuid: 's2', expire: 9_000 });

    const firstPending = await firstStart;
    const secondPending = await secondStart;

    const firstAck = client.awaitBroadcast(
      firstPending.uuid,
      session,
      firstPending.expire,
    );
    const secondAck = client.awaitBroadcast(
      secondPending.uuid,
      session,
      secondPending.expire,
    );

    transport.emit({ cmd: HAS_CMD.SIGN_ACK, uuid: 's2', data: 'trx-B' });
    transport.emit({ cmd: HAS_CMD.SIGN_ACK, uuid: 's1', data: 'trx-A' });

    await expect(firstAck).resolves.toEqual({ transactionId: 'trx-A' });
    await expect(secondAck).resolves.toEqual({ transactionId: 'trx-B' });
  });

  it('awaitBroadcast rejects after SIGN_WAIT expire plus grace when no ack', async () => {
    jest.useFakeTimers();
    let nowMs = 1_000;
    const transport = new FakeHasTransport();
    const client = await openClient(transport, () => nowMs);

    const session = {
      username: 'alice',
      key: 'k1',
      token: 't1',
      expire: 9_000,
    };

    const startPromise = client.startBroadcast({
      session,
      keyType: 'posting',
      ops: [['vote', {}]],
    });
    await Promise.resolve();

    const signExpire = 2_500;
    transport.emit({
      cmd: HAS_CMD.SIGN_WAIT,
      uuid: 's1',
      expire: signExpire,
    });

    const signPending = await startPromise;
    const ackPromise = client.awaitBroadcast(
      signPending.uuid,
      session,
      signPending.expire,
    );
    const rejectExpect = expect(ackPromise).rejects.toThrow('expired');

    nowMs = signExpire;
    await jest.advanceTimersByTimeAsync(signExpire - 1_000);
    nowMs = signExpire + HAS_SIGN_ACK_GRACE_MS;
    await jest.advanceTimersByTimeAsync(HAS_SIGN_ACK_GRACE_MS);

    await rejectExpect;
  });

  it('awaitBroadcast accepts SIGN_ACK during grace after sign deadline', async () => {
    jest.useFakeTimers();
    let nowMs = 1_000;
    const transport = new FakeHasTransport();
    const client = await openClient(transport, () => nowMs);

    const session = {
      username: 'alice',
      key: 'k1',
      token: 't1',
      expire: 9_000,
    };

    const startPromise = client.startBroadcast({
      session,
      keyType: 'posting',
      ops: [['vote', {}]],
    });
    await Promise.resolve();

    const signExpire = 2_500;
    transport.emit({
      cmd: HAS_CMD.SIGN_WAIT,
      uuid: 's1',
      expire: signExpire,
    });

    const signPending = await startPromise;
    const ackPromise = client.awaitBroadcast(
      signPending.uuid,
      session,
      signPending.expire,
    );

    nowMs = signExpire + 100;
    await jest.advanceTimersByTimeAsync(signExpire - 1_000 + 100);

    transport.emit({
      cmd: HAS_CMD.SIGN_ACK,
      uuid: 's1',
      data: 'trx-late',
    });

    await expect(ackPromise).resolves.toEqual({ transactionId: 'trx-late' });
  });

  it('rejects broadcast when session is expired', async () => {
    const transport = new FakeHasTransport();
    const client = await openClient(transport, () => 10_000);

    await expect(
      client.startBroadcast({
        session: {
          username: 'alice',
          key: 'k1',
          expire: 5_000,
        },
        keyType: 'posting',
        ops: [['vote', {}]],
      }),
    ).rejects.toThrow('HAS session expired');

    expect(transport.sent.filter((s) => s.includes('sign_req'))).toHaveLength(0);
  });

  it('sends attach_req when re-attaching pending uuid', async () => {
    const transport = new FakeHasTransport();
    const client = await openClient(transport);

    const attachPromise = client.attachPending('u1');
    await Promise.resolve();

    expect(JSON.parse(transport.sent[0]!)).toEqual({
      cmd: HAS_CMD.ATTACH_REQ,
      uuid: 'u1',
    });

    transport.emit({ cmd: HAS_CMD.ATTACH_ACK, uuid: 'u1' });
    await expect(attachPromise).resolves.toBeUndefined();
  });
});

describe('buildHasAuthDeepLink', () => {
  it('builds has://auth_req deep link', () => {
    const link = buildHasAuthDeepLink({
      account: 'alice',
      uuid: 'u1',
      key: 'k1',
      host: 'wss://hive-auth.arcange.eu',
    });

    const encoded = Buffer.from(
      JSON.stringify({
        account: 'alice',
        uuid: 'u1',
        key: 'k1',
        host: 'wss://hive-auth.arcange.eu',
      }),
    ).toString('base64');

    expect(link).toBe(`has://auth_req/${encoded}`);
  });
});

describe('encryptHasPayload', () => {
  it('produces ciphertext decryptable by CryptoJS', () => {
    const ciphertext = encryptHasPayload({ a: 1 }, 'k1');
    const second = encryptHasPayload({ a: 1 }, 'k1');

    expect(ciphertext).not.toBe(second);
    expect(
      CryptoJS.AES.decrypt(ciphertext, 'k1').toString(CryptoJS.enc.Utf8),
    ).toBe('{"a":1}');
  });
});
