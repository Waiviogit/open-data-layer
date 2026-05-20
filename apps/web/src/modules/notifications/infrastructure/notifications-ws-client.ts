'use client';

import { NOTIFICATIONS_WS_URL } from '@/config/client-env';

import { GET_NOTIFICATIONS_TIMEOUT_MS } from '../constants';

type WsEnvelope = {
  event?: string;
  data?: Record<string, unknown>;
};

type PendingTrx = {
  trxId: string;
  correlationId: string;
  resolve: () => void;
};

type PendingGetNotifications = {
  correlationId: string;
  resolve: (items: UserNotificationItem[]) => void;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface UserNotificationItem {
  id: string;
  type: string;
  occurredAt: string;
  blockNum: number;
  trxId: string | null;
  objectId: string | null;
  actor: string | null;
  payload: Record<string, unknown>;
}

export interface NotificationsWsClient {
  subscribeTrx(trxId: string): Promise<void>;
  getNotifications(): Promise<UserNotificationItem[]>;
  addNotificationListener(
    handler: (item: UserNotificationItem) => void,
  ): () => void;
  close(): void;
}

function parseUserNotificationItem(raw: unknown): UserNotificationItem | null {
  if (raw === null || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id.trim() : '';
  const type = typeof o.type === 'string' ? o.type.trim() : '';
  const occurredAt =
    typeof o.occurredAt === 'string' ? o.occurredAt.trim() : '';
  const blockNum = typeof o.blockNum === 'number' ? o.blockNum : NaN;
  if (!id || !type || !occurredAt || Number.isNaN(blockNum)) {
    return null;
  }
  return {
    id,
    type,
    occurredAt,
    blockNum,
    trxId: typeof o.trxId === 'string' ? o.trxId : null,
    objectId: typeof o.objectId === 'string' ? o.objectId : null,
    actor: typeof o.actor === 'string' ? o.actor : null,
    payload:
      o.payload !== null && typeof o.payload === 'object'
        ? (o.payload as Record<string, unknown>)
        : {},
  };
}

function parseNotificationItems(raw: unknown): UserNotificationItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const items: UserNotificationItem[] = [];
  for (const entry of raw) {
    const parsed = parseUserNotificationItem(entry);
    if (parsed) {
      items.push(parsed);
    }
  }
  return items;
}

class NotificationsWsClientImpl implements NotificationsWsClient {
  private ws: WebSocket | null = null;
  private connectPromise: Promise<void> | null = null;
  private readonly pendingByCorrelation = new Map<string, PendingTrx>();
  private readonly pendingGetNotifications = new Map<
    string,
    PendingGetNotifications
  >();
  private readonly notificationListeners = new Set<
    (item: UserNotificationItem) => void
  >();

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

  async getNotifications(): Promise<UserNotificationItem[]> {
    try {
      await this.ensureConnected();
    } catch {
      return [];
    }

    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return [];
    }

    const correlationId = crypto.randomUUID();

    return new Promise<UserNotificationItem[]>((resolve) => {
      const timeout = setTimeout(() => {
        this.pendingGetNotifications.delete(correlationId);
        resolve([]);
      }, GET_NOTIFICATIONS_TIMEOUT_MS);

      this.pendingGetNotifications.set(correlationId, {
        correlationId,
        resolve: (items) => {
          clearTimeout(timeout);
          resolve(items);
        },
      });

      ws.send(
        JSON.stringify({
          event: 'get_notifications',
          data: { correlationId },
        }),
      );
    });
  }

  addNotificationListener(
    handler: (item: UserNotificationItem) => void,
  ): () => void {
    this.notificationListeners.add(handler);
    return () => {
      this.notificationListeners.delete(handler);
    };
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
    this.connectPromise = null;
    for (const pending of this.pendingByCorrelation.values()) {
      pending.resolve();
    }
    this.pendingByCorrelation.clear();
    for (const pending of this.pendingGetNotifications.values()) {
      pending.resolve([]);
    }
    this.pendingGetNotifications.clear();
    this.notificationListeners.clear();
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
        for (const pending of this.pendingGetNotifications.values()) {
          pending.resolve([]);
        }
        this.pendingGetNotifications.clear();
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
    if (!envelope.event || !envelope.data) {
      return;
    }

    if (envelope.event === 'trx_processed') {
      this.handleTrxProcessed(envelope.data);
      return;
    }

    if (envelope.event === 'get_notifications') {
      this.handleGetNotificationsResponse(envelope.data);
      return;
    }

    if (envelope.event === 'notification') {
      const item = parseUserNotificationItem(envelope.data);
      if (!item) {
        return;
      }
      for (const listener of this.notificationListeners) {
        listener(item);
      }
    }
  }

  private handleTrxProcessed(data: Record<string, unknown>): void {
    const correlationId =
      typeof data.correlationId === 'string' ? data.correlationId.trim() : '';
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

  private handleGetNotificationsResponse(data: Record<string, unknown>): void {
    const correlationId =
      typeof data.correlationId === 'string' ? data.correlationId.trim() : '';
    if (!correlationId) {
      return;
    }
    const pending = this.pendingGetNotifications.get(correlationId);
    if (!pending) {
      return;
    }
    this.pendingGetNotifications.delete(correlationId);
    const status = typeof data.status === 'string' ? data.status : '';
    if (status !== 'ok') {
      pending.resolve([]);
      return;
    }
    pending.resolve(parseNotificationItems(data.items));
  }
}

let runtimeWsUrl: string | undefined;
let singleton: NotificationsWsClient | null | undefined;
let singletonForUrl: string | undefined;

/** Called from `NotificationsWsConfigProvider` (server passes runtime compose URL). */
export function configureNotificationsWsUrl(url: string): void {
  const trimmed = url.trim();
  runtimeWsUrl = trimmed.length > 0 ? trimmed : undefined;
  singleton = undefined;
  singletonForUrl = undefined;
}

function resolveNotificationsWsUrl(): string {
  return (runtimeWsUrl ?? NOTIFICATIONS_WS_URL).trim();
}

export function getNotificationsWsClient(): NotificationsWsClient | null {
  const url = resolveNotificationsWsUrl();
  if (!url) {
    return null;
  }
  if (singleton !== undefined && singletonForUrl === url) {
    return singleton;
  }
  singletonForUrl = url;
  singleton = new NotificationsWsClientImpl(url);
  return singleton;
}

export function sleepMs(ms: number): Promise<void> {
  return sleep(ms);
}
