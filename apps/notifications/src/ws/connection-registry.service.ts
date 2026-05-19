import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';

const CLOSE_POLICY_VIOLATION = 1008;

export interface ClientMeta {
  userId: string;
  connectedAt: Date;
  isAlive: boolean;
}

/**
 * Per-socket metadata (WeakMap) + userId → sockets for fan-out.
 */
@Injectable()
export class ConnectionRegistryService {
  private readonly logger = new Logger(ConnectionRegistryService.name);
  private readonly clientMeta = new WeakMap<WebSocket, ClientMeta>();
  private readonly userConnections = new Map<string, Set<WebSocket>>();

  constructor(private readonly config: ConfigService) {}

  private get maxConnectionsPerUser(): number {
    return (
      this.config.get<{ maxConnectionsPerUser: number }>('ws')
        ?.maxConnectionsPerUser ?? 5
    );
  }

  register(client: WebSocket, userId: string): void {
    this.clientMeta.set(client, {
      userId,
      connectedAt: new Date(),
      isAlive: true,
    });
    let sockets = this.userConnections.get(userId);
    if (!sockets) {
      sockets = new Set();
      this.userConnections.set(userId, sockets);
    }
    sockets.add(client);

    if (sockets.size > this.maxConnectionsPerUser) {
      const oldest = sockets.values().next().value;
      if (oldest) {
        sockets.delete(oldest);
        oldest.close(CLOSE_POLICY_VIOLATION, 'connection_limit_exceeded');
        this.logger.warn(
          `WS connection limit (${this.maxConnectionsPerUser}) exceeded for user '${userId}'; closed oldest`,
        );
      }
    }
  }

  remove(client: WebSocket): ClientMeta | undefined {
    const meta = this.clientMeta.get(client);
    if (!meta) {
      return undefined;
    }
    const sockets = this.userConnections.get(meta.userId);
    sockets?.delete(client);
    if (sockets && sockets.size === 0) {
      this.userConnections.delete(meta.userId);
    }
    return meta;
  }

  markAlive(client: WebSocket): void {
    const meta = this.clientMeta.get(client);
    if (meta) {
      meta.isAlive = true;
    }
  }

  markDead(client: WebSocket): void {
    const meta = this.clientMeta.get(client);
    if (meta) {
      meta.isAlive = false;
    }
  }

  getMeta(client: WebSocket): ClientMeta | undefined {
    return this.clientMeta.get(client);
  }

  getSocketsForUser(userId: string): ReadonlySet<WebSocket> {
    return this.userConnections.get(userId) ?? new Set();
  }

  /** Iterate all open sockets (heartbeat). */
  forEachClient(fn: (client: WebSocket) => void): void {
    for (const sockets of this.userConnections.values()) {
      for (const client of sockets) {
        fn(client);
      }
    }
  }
}
