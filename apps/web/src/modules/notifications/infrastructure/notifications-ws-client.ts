'use client';

import { NOTIFICATIONS_WS_URL } from '@/config/client-env';

type WsEnvelope = {
  event?: string;
  data?: Record<string, unknown>;
};

type PendingTrx = {
  trxId: string;
  correlationId: string;
  resolve: () => void;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface NotificationsWsClient {
  subscribeTrx(trxId: string): Promise<void>;
  close(): void;
}

class NotificationsWsClientImpl implements NotificationsWsClient {
  private ws: WebSocket | null = null;
  private connectPromise: Promise<void> | null = null;
  private readonly pendingByCorrelation = new Map<string, PendingTrx>();

  constructor(private readonly baseUrl: string) {}

  async subscribeTrx(trxId: string): Promise<void> {
    const normalized = trxId.trim();
    if (normalized.length === 0) {
      return;
    }

    try {
      await this.ensureConnected();
    } catch {
      return;
    }

    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const correlationId = crypto.randomUUID();

    return new Promise<void>((resolve) => {
      this.pendingByCorrelation.set(correlationId, {
        trxId: normalized,
        correlationId,
        resolve,
      });

      ws.send(
        JSON.stringify({
          event: 'subscribe',
          data: { trxId: normalized, correlationId },
        }),
      );
    });
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
    this.connectPromise = null;
    for (const pending of this.pendingByCorrelation.values()) {
      pending.resolve();
    }
    this.pendingByCorrelation.clear();
  }

  private async ensureConnected(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }
    if (this.connectPromise) {
      await this.connectPromise;
      return;
    }
    this.connectPromise = this.connect();
    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  private async connect(): Promise<void> {
    const tokenRes = await fetch('/api/auth/ws-token', { credentials: 'include' });
    if (!tokenRes.ok) {
      throw new Error('ws_token_unavailable');
    }
    const body = (await tokenRes.json()) as { token?: string };
    const token = body.token?.trim();
    if (!token) {
      throw new Error('ws_token_missing');
    }

    const url = new URL(this.baseUrl);
    url.searchParams.set('token', token);

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url.toString());
      this.ws = ws;

      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error('ws_connect_failed'));
      ws.onclose = () => {
        for (const pending of this.pendingByCorrelation.values()) {
          pending.resolve();
        }
        this.pendingByCorrelation.clear();
      };
      ws.onmessage = (ev) => {
        this.handleMessage(ev.data);
      };
    });
  }

  private handleMessage(raw: unknown): void {
    if (typeof raw !== 'string') {
      return;
    }
    let envelope: WsEnvelope;
    try {
      envelope = JSON.parse(raw) as WsEnvelope;
    } catch {
      return;
    }
    if (envelope.event !== 'trx_processed' || !envelope.data) {
      return;
    }
    const correlationId =
      typeof envelope.data.correlationId === 'string'
        ? envelope.data.correlationId.trim()
        : '';
    if (!correlationId) {
      return;
    }
    const pending = this.pendingByCorrelation.get(correlationId);
    if (!pending) {
      return;
    }
    this.pendingByCorrelation.delete(correlationId);
    pending.resolve();
  }
}

let singleton: NotificationsWsClient | null | undefined;

export function getNotificationsWsClient(): NotificationsWsClient | null {
  if (singleton !== undefined) {
    return singleton;
  }
  if (!NOTIFICATIONS_WS_URL) {
    singleton = null;
    return null;
  }
  singleton = new NotificationsWsClientImpl(NOTIFICATIONS_WS_URL);
  return singleton;
}

export function sleepMs(ms: number): Promise<void> {
  return sleep(ms);
}
