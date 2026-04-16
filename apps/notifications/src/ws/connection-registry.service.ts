import { Injectable } from '@nestjs/common';
import WebSocket from 'ws';

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
  private readonly clientMeta = new WeakMap<WebSocket, ClientMeta>();
  private readonly userConnections = new Map<string, Set<WebSocket>>();

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
