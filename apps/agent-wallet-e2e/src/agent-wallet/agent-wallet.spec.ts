import {
  mcpCallTool,
  mcpCorsProbe,
  mcpInitialize,
  mcpListTools,
  mcpRawRequest,
  mcpUnauthorized,
} from '../support/mcp-client';
import {
  FakeHasServer,
  parseHasDeepLink,
} from '../support/fake-has-server';

const REQUIRED_TOOLS = [
  'wallet_accounts',
  'wallet_status',
  'waivio_auth_start',
  'waivio_auth_status',
  'waivio_auth_logout',
  'ipfs_upload_image',
  'ipfs_upload_file',
  'odl_build_batch_import',
  'wallet_broadcast',
  'wallet_broadcast_status',
  'has_login_start',
  'has_login_status',
  'has_login_qr',
  'has_session',
  'has_logout',
  'odl_build_object_create',
  'odl_build_update_create',
  'odl_build_gallery_item',
  'has_broadcast',
  'has_broadcast_status',
  'hive_build_post',
];

function fakeHas(): FakeHasServer {
  const server = globalThis.__FAKE_HAS__;
  if (!server) {
    throw new Error('Fake HAS server is not running');
  }
  return server;
}

async function waitFor<T>(
  fn: () => T | Promise<T>,
  predicate: (value: T) => boolean,
  timeoutMs = 5_000,
): Promise<T> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await fn();
    if (predicate(value)) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Timed out waiting for condition');
}

async function readPendingDeepLink(requestId: string): Promise<string> {
  const artifacts = await mcpCallTool<{ deepLink: string }>('has_login_qr', {
    requestId,
  });
  expect(artifacts.isError).toBe(false);
  return artifacts.data.deepLink;
}

async function ensureLoggedIn(account: string): Promise<void> {
  const session = await mcpCallTool<{ active: boolean; session?: { account: string } }>(
    'has_session',
    {},
  );
  if (
    session.data.active &&
    session.data.session?.account === account
  ) {
    return;
  }

  const login = await mcpCallTool<{
    requestId: string;
    alreadyActive?: boolean;
  }>('has_login_start', { account });

  expect(login.isError).toBe(false);
  if (login.data.alreadyActive) {
    return;
  }

  const link = parseHasDeepLink(await readPendingDeepLink(login.data.requestId));
  await fakeHas().approveAuth({
    uuid: link.uuid,
    authKey: link.key,
    account: link.account,
  });

  await waitFor(
    () =>
      mcpCallTool<{ status: string }>('has_login_status', {
        requestId: login.data.requestId,
      }),
    (result) => result.data.status === 'active',
  );
}

describe('agent-wallet MCP (e2e)', () => {
  it('rejects MCP without bearer token', async () => {
    expect(await mcpUnauthorized()).toBe(401);
  });

  it('returns health ok with wallet status snapshot', async () => {
    const host = process.env.HOST ?? '127.0.0.1';
    const port = process.env.PORT ?? '7500';
    const res = await fetch(`http://${host}:${port}/agent-wallet/health`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      status: string;
      wallet: { localAccounts: unknown[]; signingMode: string };
    };
    expect(body.status).toBe('ok');
    expect(body.wallet.signingMode).toBeDefined();
    expect(Array.isArray(body.wallet.localAccounts)).toBe(true);
  });

  it('rejects GET stream probe with 405 instead of 404', async () => {
    const token = process.env.AGENT_WALLET_BEARER_TOKEN;
    expect(token).toBeDefined();

    const res = await mcpRawRequest({
      method: 'GET',
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'text/event-stream',
      },
    });

    expect(res.status).toBe(405);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(res.body).toEqual({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Method Not Allowed: agent-wallet MCP is stateless (POST only)',
      },
      id: null,
    });
  });

  it('rejects DELETE with 405', async () => {
    const token = process.env.AGENT_WALLET_BEARER_TOKEN;
    expect(token).toBeDefined();

    const res = await mcpRawRequest({
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(res.status).toBe(405);
    expect(res.body).toMatchObject({
      jsonrpc: '2.0',
      error: { code: -32000 },
      id: null,
    });
  });

  it('requires authorization before reporting method restriction on GET', async () => {
    const res = await mcpRawRequest({
      method: 'GET',
      headers: {
        accept: 'text/event-stream',
      },
    });

    expect(res.status).toBe(401);
  });

  it('rejects POST when Accept omits text/event-stream', async () => {
    const token = process.env.AGENT_WALLET_BEARER_TOKEN;
    expect(token).toBeDefined();

    const res = await mcpRawRequest({
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      },
    });

    expect(res.status).toBe(406);
  });

  it('initializes MCP with required tools and no CORS headers', async () => {
    const result = await mcpInitialize();
    expect(result?.serverInfo?.name).toBe('agent-wallet');

    const tools = await mcpListTools();
    for (const tool of REQUIRED_TOOLS) {
      expect(tools).toContain(tool);
    }

    const headers = await mcpCorsProbe();
    expect(headers.get('access-control-allow-origin')).toBeNull();
  });

  it('runs login → object_create → broadcast happy path', async () => {
    const login = await mcpCallTool<{
      requestId: string;
      webLink: string;
    }>('has_login_start', { account: 'alice' });

    expect(login.isError).toBe(false);
    expect(login.rawText).not.toContain('eyJ');
    expect(login.rawText).not.toContain('qrAscii');

    const qr = await mcpCallTool<{ deepLink: string; qrAscii: string }>(
      'has_login_qr',
      { requestId: login.data.requestId },
    );
    expect(qr.data.deepLink.startsWith('has://auth_req/')).toBe(true);
    expect(qr.data.qrAscii.length).toBeGreaterThan(0);

    const link = parseHasDeepLink(qr.data.deepLink);
    await fakeHas().approveAuth({
      uuid: link.uuid,
      authKey: link.key,
      account: link.account,
    });

    const loginStatus = await waitFor(
      () =>
        mcpCallTool<{ status: string }>('has_login_status', {
          requestId: login.data.requestId,
        }),
      (result) => result.data.status === 'active',
    );
    expect(loginStatus.data.status).toBe('active');

    const session = await mcpCallTool<{ active: boolean; session: { account: string } }>(
      'has_session',
      {},
    );
    expect(session.data.active).toBe(true);
    expect(session.data.session.account).toBe('alice');
    expect(session.rawText).not.toContain(link.key);

    const built = await mcpCallTool<{
      ops: unknown[];
      opsCount: number;
      bytes: number;
      perOpBytes: number[];
    }>('odl_build_object_create', {
      objectType: 'recipe',
      objectId: 'recipe-e2e-1',
      creator: 'alice',
      fields: [{ updateType: 'name', value: 'Borscht' }],
    });
    expect(built.data.opsCount).toBeGreaterThan(0);
    expect(built.data.perOpBytes).toHaveLength(built.data.opsCount);

    const broadcast = await mcpCallTool<{ requestId: string }>('has_broadcast', {
      ops: built.data.ops,
      keyType: 'posting',
    });
    expect(broadcast.isError).toBe(false);

    const broadcastStatus = await waitFor(
      () =>
        mcpCallTool<{ status: string; transactionId?: string }>(
          'has_broadcast_status',
          { requestId: broadcast.data.requestId },
        ),
      (result) => result.data.status === 'signed',
    );
    expect(broadcastStatus.data.transactionId).toBe('trx-fake-1');
  });

  it('returns requiresIpfsBatch for oversize update_create', async () => {
    const built = await mcpCallTool<{
      requiresIpfsBatch?: boolean;
      ops: unknown[];
      envelopeJson?: string;
    }>('odl_build_update_create', {
      objectId: 'skill-e2e-oversize',
      creator: 'alice',
      updateType: 'skillContent',
      value: 'x'.repeat(20_000),
    });

    expect(built.isError).toBe(false);
    expect(built.data.requiresIpfsBatch).toBe(true);
    expect(built.data.ops).toEqual([]);
    expect(built.data.envelopeJson).toBeDefined();
  });

  it('builds update_create without object_create for existing objects', async () => {
    const built = await mcpCallTool<{
      ops: Array<{ json?: string }>;
      opsCount: number;
    }>('odl_build_update_create', {
      objectId: 'recipe-e2e-existing',
      creator: 'alice',
      updateType: 'image',
      value: { cid: 'QmE2eTestCid' },
    });

    expect(built.isError).toBe(false);
    expect(built.data.opsCount).toBe(1);
    const envelope = JSON.parse(built.data.ops[0]?.json ?? '{}') as {
      events: Array<{ action: string }>;
    };
    expect(envelope.events).toHaveLength(1);
    expect(envelope.events[0]?.action).toBe('update_create');
  });

  it('returns rejected broadcast status when user rejects', async () => {
    await ensureLoggedIn('alice');

    const built = await mcpCallTool<{ ops: unknown[] }>('odl_build_object_create', {
      objectType: 'recipe',
      objectId: 'recipe-e2e-reject',
      creator: 'alice',
      fields: [{ updateType: 'name', value: 'Reject me' }],
    });

    fakeHas().setNextSignBehavior('reject');

    const broadcast = await mcpCallTool<{ requestId: string }>('has_broadcast', {
      ops: built.data.ops,
      keyType: 'posting',
    });

    const status = await waitFor(
      () =>
        mcpCallTool<{ status: string; transactionId?: string }>(
          'has_broadcast_status',
          { requestId: broadcast.data.requestId },
        ),
      (result) => result.data.status === 'rejected',
    );

    expect(status.data.transactionId).toBeUndefined();
  });

  it('rejects broadcast without active session after logout', async () => {
    await mcpCallTool('has_logout', {});

    const result = await mcpCallTool('has_broadcast', {
      ops: [
        {
          type: 'custom_json',
          json: '{"events":[]}',
          required_auths: [],
          required_posting_auths: ['alice'],
          id: 'odl-testnet',
        },
      ],
      keyType: 'posting',
    });

    expect(result.isError).toBe(true);
    expect(result.rawText).toContain('No active HAS session');
  });

  it('reuses a live pending login on repeated has_login_start', async () => {
    const first = await mcpCallTool<{ requestId: string; webLink: string }>(
      'has_login_start',
      { account: 'alice' },
    );
    const second = await mcpCallTool<{ requestId: string; webLink: string }>(
      'has_login_start',
      { account: 'alice' },
    );

    expect(second.data.requestId).toBe(first.data.requestId);
    expect(second.data.webLink).toBe(first.data.webLink);
    expect(first.data.webLink).toContain('/has#1');
  });

  it('reports empty account registry when no accounts.json or env keys', async () => {
    const accounts = await mcpCallTool<{
      accounts: unknown[];
      accountsSource: string;
    }>('wallet_accounts', {});
    expect(accounts.isError).toBe(false);
    expect(accounts.data.accounts).toEqual([]);
    expect(accounts.data.accountsSource).toBe('none');
  });

  it('wallet_status keeps legacy field names with empty registry', async () => {
    const status = await mcpCallTool<{
      signingMode: string;
      hasSession: unknown;
      waivioAuth: unknown;
      localKeys: unknown;
      localAccounts: unknown[];
    }>('wallet_status', {});
    expect(status.isError).toBe(false);
    expect(status.data.signingMode).toBeDefined();
    expect(status.data.hasSession).toBeDefined();
    expect(status.data.waivioAuth).toBeDefined();
    expect(status.data.localKeys).toBeDefined();
    expect(Array.isArray(status.data.localAccounts)).toBe(true);
  });

  it('rejects wallet_broadcast for unknown account without crashing daemon', async () => {
    const broadcast = await mcpCallTool('wallet_broadcast', {
      ops: [
        {
          type: 'custom_json',
          json: '{"events":[]}',
          required_auths: [],
          required_posting_auths: ['nobody'],
          id: 'odl-testnet',
        },
      ],
      account: 'nobody',
      keyType: 'posting',
    });
    expect(broadcast.isError).toBe(true);
    expect(broadcast.rawText).toContain('nobody');

    const status = await mcpCallTool('wallet_status', {});
    expect(status.isError).toBe(false);
  });
});
