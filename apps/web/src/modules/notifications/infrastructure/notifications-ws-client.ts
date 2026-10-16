'use client';

import { NOTIFICATIONS_WS_URL } from '@/config/client-env';

import {
  GET_NOTIFICATIONS_TIMEOUT_MS,
  WS_RECONNECT_INITIAL_MS,
  WS_RECONNECT_MAX_MS,
} from '../constants';

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
  resolve: (snapshot: NotificationFeedSnapshot) => void;
};

type PendingMarkRead = {
  correlationId: string;
  resolve: (lastReadTimestamp: number | null) => void;
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

export type NotificationFeedSnapshot = {
  items: UserNotificationItem[];
  lastReadTimestamp: number | null;
};

export interface NotificationsWsClient {
  subscribeTrx(trxId: string): Promise<void>;
  getNotifications(): Promise<NotificationFeedSnapshot>;
  markRead(): Promise<number | null>;
  addNotificationListener(
    handler: (item: UserNotificationItem) => void,
  ): () => void;
  addReconnectListener(handler: () => void): () => void;
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

function reconnectDelayMs(attempt: number): number {
  const base = Math.min(
    WS_RECONNECT_MAX_MS,
    WS_RECONNECT_INITIAL_MS * 2 ** attempt,
  );
  const jitter = Math.floor(Math.random() * 250);
  return base + jitter;
}

export class NotificationsWsClientImpl implements NotificationsWsClient {
  private ws: WebSocket | null = null;
  private connectPromise: Promise<void> | null = null;
  private intentionalClose = false;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private hadSuccessfulConnection = false;
  private readonly pendingByCorrelation = new Map<string, PendingTrx>();
  private readonly pendingGetNotifications = new Map<
    string,
    PendingGetNotifications
  >();
  private readonly pendingMarkRead = new Map<string, PendingMarkRead>();
  private readonly notificationListeners = new Set<
    (item: UserNotificationItem) => void
  >();
  private readonly reconnectListeners = new Set<() => void>();
  private readonly boundOnVisibilityChange: () => void;
  private readonly boundOnOnline: () => void;

  constructor(private readonly baseUrl: string) {
    this.boundOnVisibilityChange = () => {
      if (typeof document === 'undefined') {
        return;
      }
      if (document.visibilityState !== 'visible') {
        return;
      }
      if (this.intentionalClose) {
        return;
      }
      if (this.hasLiveSocket()) {
        return;
      }
      void this.ensureConnected().catch(() => undefined);
    };
    this.boundOnOnline = () => {
      if (this.intentionalClose) {
        return;
      }
      if (this.hasLiveSocket()) {
        return;
      }
      void this.ensureConnected().catch(() => undefined);
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.boundOnVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.boundOnOnline);
    }
  }

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

  async getNotifications(): Promise<NotificationFeedSnapshot> {
    try {
      await this.ensureConnected();
    } catch {
      return { items: [], lastReadTimestamp: null };
    }

    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return { items: [], lastReadTimestamp: null };
    }

    const correlationId = crypto.randomUUID();

    return new Promise<NotificationFeedSnapshot>((resolve) => {
      const timeout = setTimeout(() => {
        this.pendingGetNotifications.delete(correlationId);
        resolve({ items: [], lastReadTimestamp: null });
      }, GET_NOTIFICATIONS_TIMEOUT_MS);

      this.pendingGetNotifications.set(correlationId, {
        correlationId,
        resolve: (snapshot) => {
          clearTimeout(timeout);
          resolve(snapshot);
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

  async markRead(): Promise<number | null> {
    try {
      await this.ensureConnected();
    } catch {
      return null;
    }
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return null;
    }
    const correlationId = crypto.randomUUID();
    return new Promise<number | null>((resolve) => {
      const timeout = setTimeout(() => {
        this.pendingMarkRead.delete(correlationId);
        resolve(null);
      }, GET_NOTIFICATIONS_TIMEOUT_MS);
      this.pendingMarkRead.set(correlationId, {
        correlationId,
        resolve: (ts) => {
          clearTimeout(timeout);
          resolve(ts);
        },
      });
      ws.send(
        JSON.stringify({
          event: 'mark_read',
          data: { correlationId },
        }),
      );
    });
  }

  addNotificationListener(
    handler: (item: UserNotificationItem) => void,
  ): () => void {
    this.notificationListeners.add(handler);
    void this.ensureConnected().catch(() => undefined);
    return () => {
      this.notificationListeners.delete(handler);
    };
  }

  addReconnectListener(handler: () => void): () => void {
    this.reconnectListeners.add(handler);
    return () => {
      this.reconnectListeners.delete(handler);
    };
  }

  close(): void {
    this.intentionalClose = true;
    this.clearReconnectTimer();
    if (typeof document !== 'undefined') {
      document.removeEventListener(
        'visibilitychange',
        this.boundOnVisibilityChange,
      );
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.boundOnOnline);
    }
    this.ws?.close();
    this.ws = null;
    this.connectPromise = null;
    this.rejectPendingRpcOnDisconnect();
    this.pendingByCorrelation.clear();
    this.notificationListeners.clear();
    this.reconnectListeners.clear();
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private rejectPendingRpcOnDisconnect(): void {
    for (const pending of this.pendingGetNotifications.values()) {
      pending.resolve({ items: [], lastReadTimestamp: null });
    }
    this.pendingGetNotifications.clear();
    for (const pending of this.pendingMarkRead.values()) {
      pending.resolve(null);
    }
    this.pendingMarkRead.clear();
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose) {
      return;
    }
    if (this.reconnectTimer !== null) {
      return;
    }
    const delay = reconnectDelayMs(this.reconnectAttempt);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.ensureConnected()
        .catch(() => {
          this.scheduleReconnect();
        });
    }, delay);
  }

  private notifyReconnectListeners(): void {
    for (const listener of this.reconnectListeners) {
      listener();
    }
  }

  private handleSocketClose(closed: WebSocket): void {
    if (this.ws !== closed) {
      return;
    }
    this.ws = null;
    this.connectPromise = null;
    this.pendingByCorrelation.clear();
    this.rejectPendingRpcOnDisconnect();
    if (!this.intentionalClose) {
      this.scheduleReconnect();
    }
  }

  private hasLiveSocket(): boolean {
    const state = this.ws?.readyState;
    return state === WebSocket.OPEN || state === WebSocket.CONNECTING;
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

      ws.onopen = () => {
        if (this.ws !== ws) {
          return;
        }
        const isReconnect = this.hadSuccessfulConnection;
        this.hadSuccessfulConnection = true;
        this.reconnectAttempt = 0;
        this.clearReconnectTimer();
        resolve();
        if (isReconnect) {
          this.notifyReconnectListeners();
        }
      };
      ws.onerror = () => {
        if (this.ws !== ws) {
          return;
        }
        reject(new Error('ws_connect_failed'));
      };
      ws.onclose = () => {
        if (this.ws !== ws) {
          return;
        }
        this.handleSocketClose(ws);
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

    if (envelope.event === 'mark_read') {
      this.handleMarkReadResponse(envelope.data);
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
      pending.resolve({ items: [], lastReadTimestamp: null });
      return;
    }
    const lastReadTimestamp =
      typeof data.lastReadTimestamp === 'number' &&
      Number.isFinite(data.lastReadTimestamp)
        ? data.lastReadTimestamp
        : null;
    pending.resolve({
      items: parseNotificationItems(data.items),
      lastReadTimestamp,
    });
  }

  private handleMarkReadResponse(data: Record<string, unknown>): void {
    const correlationId =
      typeof data.correlationId === 'string' ? data.correlationId.trim() : '';
    if (!correlationId) {
      return;
    }
    const pending = this.pendingMarkRead.get(correlationId);
    if (!pending) {
      return;
    }
    this.pendingMarkRead.delete(correlationId);
    const status = typeof data.status === 'string' ? data.status : '';
    if (status !== 'ok') {
      pending.resolve(null);
      return;
    }
    const lastReadTimestamp =
      typeof data.lastReadTimestamp === 'number' &&
      Number.isFinite(data.lastReadTimestamp)
        ? data.lastReadTimestamp
        : null;
    pending.resolve(lastReadTimestamp);
  }
}

let runtimeWsUrl: string | undefined;
let singleton: NotificationsWsClient | null | undefined;
let singletonForUrl: string | undefined;

/** For unit tests — bypasses singleton. */
export function createNotificationsWsClient(
  baseUrl: string,
): NotificationsWsClient {
  return new NotificationsWsClientImpl(baseUrl);
}

/** Called from `NotificationsWsConfigProvider` (server passes runtime compose URL). */
export function configureNotificationsWsUrl(url: string): void {
  const trimmed = url.trim();
  const nextUrl = trimmed.length > 0 ? trimmed : undefined;
  if (nextUrl === runtimeWsUrl) {
    return;
  }
  singleton?.close();
  runtimeWsUrl = nextUrl;
  singleton = undefined;
  singletonForUrl = undefined;
}

/** @internal Test helper */
export function resetNotificationsWsSingletonForTests(): void {
  singleton?.close();
  singleton = undefined;
  singletonForUrl = undefined;
  runtimeWsUrl = undefined;
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
