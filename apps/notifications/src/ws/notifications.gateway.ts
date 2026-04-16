import { JwtService } from '@nestjs/jwt';
import type { IncomingMessage } from 'http';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import WebSocket from 'ws';
import { ConnectionRegistryService } from './connection-registry.service';
import { SubscriptionService } from './subscription.service';
import { wsSendJson } from './ws-message';

const CLOSE_POLICY_VIOLATION = 1008;

function extractBearerToken(request: IncomingMessage, url: URL): string | null {
  const queryTok = url.searchParams.get('token');
  if (queryTok && queryTok.trim().length > 0) {
    return queryTok.trim();
  }
  const auth = request.headers.authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice('Bearer '.length).trim();
  }
  return null;
}

function parseSubscribePayload(raw: unknown):
  | { ok: true; trxId: string; correlationId: string }
  | { ok: false; correlationId: string; reason: string } {
  if (raw === null || typeof raw !== 'object') {
    return { ok: false, correlationId: '', reason: 'invalid_body' };
  }
  const o = raw as Record<string, unknown>;
  const trxId = typeof o.trxId === 'string' ? o.trxId.trim() : '';
  const correlationId =
    typeof o.correlationId === 'string' ? o.correlationId.trim() : '';
  if (!correlationId) {
    return { ok: false, correlationId: '', reason: 'missing_correlationId' };
  }
  if (!trxId) {
    return { ok: false, correlationId, reason: 'missing_trxId' };
  }
  return { ok: true, trxId, correlationId };
}

@WebSocketGateway({ path: '/notifications', transports: ['websocket'] })
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private readonly jwtService: JwtService,
    private readonly registry: ConnectionRegistryService,
    private readonly subscriptions: SubscriptionService,
  ) {}

  handleConnection(client: WebSocket, request: IncomingMessage): void {
    const host = request.headers.host ?? 'localhost';
    const proto = 'ws';
    let url: URL;
    try {
      url = new URL(request.url ?? '/', `${proto}://${host}`);
    } catch {
      client.close(CLOSE_POLICY_VIOLATION, 'Invalid URL');
      return;
    }

    const token = extractBearerToken(request, url);
    if (!token) {
      client.close(CLOSE_POLICY_VIOLATION, 'Unauthorized');
      return;
    }

    let payload: { sub?: string };
    try {
      payload = this.jwtService.verify<{ sub?: string }>(token);
    } catch {
      client.close(CLOSE_POLICY_VIOLATION, 'Unauthorized');
      return;
    }

    const sub = payload.sub;
    if (typeof sub !== 'string' || sub.trim().length === 0) {
      client.close(CLOSE_POLICY_VIOLATION, 'Unauthorized');
      return;
    }

    this.registry.register(client, sub.trim());
    this.registry.markAlive(client);
    client.on('pong', () => {
      this.registry.markAlive(client);
    });
  }

  handleDisconnect(client: WebSocket): void {
    this.registry.remove(client);
    this.subscriptions.removeClient(client);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() raw: unknown,
  ): void {
    const parsed = parseSubscribePayload(raw);
    if (parsed.ok === false) {
      wsSendJson(client, 'subscribe_ack', {
        correlationId: parsed.correlationId,
        status: 'error' as const,
        reason: parsed.reason,
      });
      return;
    }
    this.subscriptions.subscribe(parsed.trxId, client);
    wsSendJson(client, 'subscribe_ack', {
      correlationId: parsed.correlationId,
      status: 'ok' as const,
    });
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() raw: unknown,
  ): void {
    const parsed = parseSubscribePayload(raw);
    if (parsed.ok === false) {
      wsSendJson(client, 'unsubscribe_ack', {
        correlationId: parsed.correlationId,
        status: 'error' as const,
        reason: parsed.reason,
      });
      return;
    }
    this.subscriptions.unsubscribe(parsed.trxId, client);
    wsSendJson(client, 'unsubscribe_ack', {
      correlationId: parsed.correlationId,
      status: 'ok' as const,
    });
  }
}
