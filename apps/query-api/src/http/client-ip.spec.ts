import express, { type Request } from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mcpRequestContextFromRequest } from '../mcp/mcp-request-context';
import { resolveClientIp } from './client-ip';

async function withApp(
  trustProxy: number,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = express();
  app.set('trust proxy', trustProxy);
  app.use(express.json());
  app.get('/ip', (req, res) => {
    res.json({ ip: resolveClientIp(req) });
  });
  app.post('/mcp-ctx', (req, res) => {
    res.json(mcpRequestContextFromRequest(req));
  });
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  try {
    const { port } = server.address() as AddressInfo;
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

describe('resolveClientIp', () => {
  it('ignores a forged left X-Forwarded-For hop when trust proxy is 1', async () => {
    await withApp(1, async (base) => {
      const res = await fetch(`${base}/ip`, {
        headers: { 'X-Forwarded-For': '6.6.6.6, 1.2.3.4' },
      });
      expect(await res.json()).toEqual({ ip: '1.2.3.4' });
    });
  });

  it('ignores X-Forwarded-For when trust proxy is 0', async () => {
    await withApp(0, async (base) => {
      const res = await fetch(`${base}/ip`, {
        headers: { 'X-Forwarded-For': '6.6.6.6, 1.2.3.4' },
      });
      const body = (await res.json()) as { ip: string | null };
      expect(body.ip).toBe('127.0.0.1');
    });
  });

  it('uses a single X-Forwarded-For hop when trust proxy is 1', async () => {
    await withApp(1, async (base) => {
      const res = await fetch(`${base}/ip`, {
        headers: { 'X-Forwarded-For': '1.2.3.4' },
      });
      expect(await res.json()).toEqual({ ip: '1.2.3.4' });
    });
  });

  it('takes the client in front of CDN and nginx when trust proxy is 2', async () => {
    await withApp(2, async (base) => {
      const res = await fetch(`${base}/ip`, {
        headers: { 'X-Forwarded-For': '1.2.3.4, 10.0.0.2' },
      });
      expect(await res.json()).toEqual({ ip: '1.2.3.4' });
    });
  });

  it('uses the socket address when trust proxy is 1 and X-Forwarded-For is missing', async () => {
    await withApp(1, async (base) => {
      const res = await fetch(`${base}/ip`);
      const body = (await res.json()) as { ip: string | null };
      expect(body.ip).toBe('127.0.0.1');
    });
  });

  it('strips IPv4-mapped prefix on req.ip', () => {
    expect(
      resolveClientIp({ ip: '::ffff:127.0.0.1' } as Request),
    ).toBe('127.0.0.1');
  });
});

describe('mcpRequestContextFromRequest', () => {
  it('takes clientIp from the HTTP request, not JSON-RPC tool args', async () => {
    await withApp(1, async (base) => {
      const res = await fetch(`${base}/mcp-ctx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '6.6.6.6, 1.2.3.4',
        },
        body: JSON.stringify({ params: { ip: '9.9.9.9' } }),
      });
      expect(await res.json()).toEqual({ clientIp: '1.2.3.4' });
    });
  });

  it('registers null clientIp when the address cannot be normalized', () => {
    const ctx = mcpRequestContextFromRequest({
      ip: 'not-an-ip',
    } as never);
    expect(ctx).toEqual({ clientIp: null });
  });
});
