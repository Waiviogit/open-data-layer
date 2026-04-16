import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';
import { wsSendJson } from './ws-message';

/**
 * trx_id subscriptions with TTL timers and one-time delivery on notify.
 */
@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly subscriptions = new Map<string, Set<WebSocket>>();
  private readonly timers = new Map<string, NodeJS.Timeout>();
  /** Fast cleanup on disconnect: socket → subscribed trx ids */
  private readonly clientTrxIds = new Map<WebSocket, Set<string>>();

  constructor(private readonly config: ConfigService) {}

  private get ttlMs(): number {
    const sub = this.config.get<{ ttlSeconds: number }>('subscription');
    const seconds = sub?.ttlSeconds ?? 300;
    return seconds * 1000;
  }

  subscribe(trxId: string, client: WebSocket): void {
    const normalized = trxId.trim();
    if (normalized.length === 0) {
      return;
    }

    let subs = this.subscriptions.get(normalized);
    if (!subs) {
      subs = new Set();
      this.subscriptions.set(normalized, subs);
    }
    subs.add(client);

    let trxForClient = this.clientTrxIds.get(client);
    if (!trxForClient) {
      trxForClient = new Set();
      this.clientTrxIds.set(client, trxForClient);
    }
    trxForClient.add(normalized);

    this.refreshTtl(normalized);
  }

  private refreshTtl(trxId: string): void {
    const existing = this.timers.get(trxId);
    if (existing) {
      clearTimeout(existing);
    }
    const timer = setTimeout(() => this.onTtlExpired(trxId), this.ttlMs);
    this.timers.set(trxId, timer);
  }

  private onTtlExpired(trxId: string): void {
    this.timers.delete(trxId);
    const sockets = this.subscriptions.get(trxId);
    if (!sockets) {
      return;
    }
    for (const client of sockets) {
      this.clientTrxIds.get(client)?.delete(trxId);
      if (this.clientTrxIds.get(client)?.size === 0) {
        this.clientTrxIds.delete(client);
      }
    }
    this.subscriptions.delete(trxId);
    this.logger.debug(`subscription TTL expired for trx '${trxId}'`);
  }

  unsubscribe(trxId: string, client: WebSocket): void {
    const normalized = trxId.trim();
    if (normalized.length === 0) {
      return;
    }
    const set = this.subscriptions.get(normalized);
    set?.delete(client);
    if (set && set.size === 0) {
      const t = this.timers.get(normalized);
      if (t) {
        clearTimeout(t);
        this.timers.delete(normalized);
      }
      this.subscriptions.delete(normalized);
    }
    this.clientTrxIds.get(client)?.delete(normalized);
    if (this.clientTrxIds.get(client)?.size === 0) {
      this.clientTrxIds.delete(client);
    }
  }

  /**
   * Dispatches to subscribers, then removes subscription (one-time).
   */
  notifyTrxProcessed(
    trxId: string,
    payload: Record<string, unknown>,
  ): void {
    const normalized = trxId.trim();
    const sockets = this.subscriptions.get(normalized);
    if (!sockets || sockets.size === 0) {
      return;
    }

    const data = { ...payload, trxId: normalized };
    for (const client of sockets) {
      wsSendJson(client, 'trx_processed', data);
      this.clientTrxIds.get(client)?.delete(normalized);
      if (this.clientTrxIds.get(client)?.size === 0) {
        this.clientTrxIds.delete(client);
      }
    }

    const t = this.timers.get(normalized);
    if (t) {
      clearTimeout(t);
      this.timers.delete(normalized);
    }
    this.subscriptions.delete(normalized);
  }

  removeClient(client: WebSocket): void {
    const ids = this.clientTrxIds.get(client);
    if (!ids) {
      return;
    }
    for (const trxId of ids) {
      const set = this.subscriptions.get(trxId);
      set?.delete(client);
      if (set && set.size === 0) {
        const timer = this.timers.get(trxId);
        if (timer) {
          clearTimeout(timer);
          this.timers.delete(trxId);
        }
        this.subscriptions.delete(trxId);
      }
    }
    this.clientTrxIds.delete(client);
  }
}
