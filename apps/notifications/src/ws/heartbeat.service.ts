import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';
import { ConnectionRegistryService } from './connection-registry.service';
import { SubscriptionService } from './subscription.service';

/**
 * Native WebSocket ping/pong keepalive (see `ws` heartbeat pattern).
 */
@Injectable()
export class HeartbeatService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HeartbeatService.name);
  private interval: NodeJS.Timeout | undefined;

  constructor(
    private readonly registry: ConnectionRegistryService,
    private readonly subscriptions: SubscriptionService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const ms = this.config.get<{ pingIntervalMs: number }>('ws')?.pingIntervalMs ?? 30_000;
    this.interval = setInterval(() => {
      try {
        this.runPingSweep();
      } catch (err: unknown) {
        this.logger.error(err instanceof Error ? err.message : String(err));
      }
    }, ms);
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  private runPingSweep(): void {
    const clients: WebSocket[] = [];
    this.registry.forEachClient((c) => clients.push(c));

    for (const client of clients) {
      const meta = this.registry.getMeta(client);
      if (!meta) {
        continue;
      }
      if (!meta.isAlive) {
        client.terminate();
        this.registry.remove(client);
        this.subscriptions.removeClient(client);
        continue;
      }
      this.registry.markDead(client);
      client.ping();
    }
  }
}
