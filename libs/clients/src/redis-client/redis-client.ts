import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis, { ChainableCommander } from 'ioredis';
import {
  RedisClientInterface,
  RedisClientFactoryInterface,
  RedisPipelineInterface,
} from './interface';
import { REDIS_MODULE_OPTIONS } from './redis-client.options';
import type { RedisModuleOptions } from './redis-client.options';

type NativePipeline = ChainableCommander;

class RedisPipelineWrapper implements RedisPipelineInterface {
  constructor(private readonly pipeline: NativePipeline) {}

  hSet(key: string, field: string, value: string | number): this {
    this.pipeline.hset(key, field, value);
    return this;
  }

  hIncrBy(key: string, field: string, increment: number): this {
    this.pipeline.hincrby(key, field, increment);
    return this;
  }

  expire(key: string, ttlSeconds: number): this {
    this.pipeline.expire(key, ttlSeconds);
    return this;
  }

  async exec(): Promise<void> {
    await this.pipeline.exec();
  }
}

class RedisClientWrapper implements RedisClientInterface {
  constructor(private readonly client: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.set(key, value, 'EX', ttl);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async hGet(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hSet(
    key: string,
    field: string,
    value: string | number,
  ): Promise<void> {
    await this.client.hset(key, field, value);
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hIncrBy(key: string, field: string, increment: number): Promise<void> {
    await this.client.hincrby(key, field, increment);
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  async zIncrBy(
    key: string,
    increment: number,
    member: string,
  ): Promise<number> {
    return Number(await this.client.zincrby(key, increment, member));
  }

  pipeline(): RedisPipelineInterface {
    return new RedisPipelineWrapper(this.client.pipeline());
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message);
  }
}

@Injectable()
export class RedisClientFactory
  implements RedisClientFactoryInterface, OnModuleDestroy
{
  private readonly logger = new Logger(RedisClientFactory.name);
  private readonly clients = new Map<number, RedisClientWrapper>();
  private readonly redisUri: string;

  constructor(@Inject(REDIS_MODULE_OPTIONS) options: RedisModuleOptions) {
    this.redisUri = options.uri;
  }

  getClient(db = 0): RedisClientInterface {
    if (this.clients.has(db)) {
      return this.clients.get(db)!;
    }

    const client = new Redis(this.redisUri, {
      db,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
    });

    client.on('error', (err) => {
      this.logger.error(`Redis db:${db} error: ${err.message}`);
    });

    client.on('connect', () => {
      this.logger.log(`Redis db:${db} connected`);
    });

    const wrapper = new RedisClientWrapper(client);
    this.clients.set(db, wrapper);

    return wrapper;
  }

  async onModuleDestroy(): Promise<void> {
    const disconnects: Promise<void>[] = [];
    for (const [db, wrapper] of this.clients) {
      this.logger.log(`Disconnecting Redis db:${db}`);
      disconnects.push(
        (wrapper as unknown as { client: Redis }).client
          .quit()
          .then(() => undefined),
      );
    }
    await Promise.all(disconnects);
    this.clients.clear();
  }
}
