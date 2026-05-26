import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis, { ChainableCommander } from 'ioredis';
import {
  RedisClientInterface,
  RedisClientFactoryInterface,
  RedisPipelineInterface,
  RedisStreamEntry,
} from './interface';
import { parseRedisUri } from './parse-redis-uri';
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

  lPush(key: string, ...values: string[]): this {
    this.pipeline.lpush(key, ...values);
    return this;
  }

  lTrim(key: string, start: number, stop: number): this {
    this.pipeline.ltrim(key, start, stop);
    return this;
  }

  async exec(): Promise<void> {
    await this.pipeline.exec();
  }
}

const RELEASE_LOCK_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

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

  async trySetNx(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const r = await this.client.set(
      key,
      value,
      'EX',
      ttlSeconds,
      'NX',
    );
    return r === 'OK';
  }

  async releaseLockIfValue(
    key: string,
    expectedValue: string,
  ): Promise<boolean> {
    const n = (await this.client.eval(
      RELEASE_LOCK_LUA,
      1,
      key,
      expectedValue,
    )) as number;
    return n === 1;
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

  async xAdd(stream: string, fields: Record<string, string>): Promise<string> {
    const flat: string[] = [];
    for (const [k, v] of Object.entries(fields)) {
      flat.push(k, v);
    }
    const id = await this.client.xadd(stream, '*', ...flat);
    if (id === null) {
      throw new Error(`Redis XADD returned null for stream ${stream}`);
    }
    return id;
  }

  async xGroupCreate(
    stream: string,
    group: string,
    id: string,
    mkstream = false,
  ): Promise<void> {
    try {
      if (mkstream) {
        await this.client.xgroup('CREATE', stream, group, id, 'MKSTREAM');
      } else {
        await this.client.xgroup('CREATE', stream, group, id);
      }
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (!msg.includes('BUSYGROUP')) {
        throw err;
      }
    }
  }

  async xReadGroup(
    group: string,
    consumer: string,
    streams: { key: string; id: string }[],
    options?: { count?: number; blockMs?: number },
  ): Promise<RedisStreamEntry[]> {
    const keys = streams.map((s) => s.key);
    const ids = streams.map((s) => s.id);
    const args: (string | number)[] = ['GROUP', group, consumer];
    if (options?.count !== undefined) {
      args.push('COUNT', options.count);
    }
    if (options?.blockMs !== undefined) {
      args.push('BLOCK', options.blockMs);
    }
    args.push('STREAMS', ...keys, ...ids);

    const raw = (await this.client.call('XREADGROUP', ...args)) as
      | null
      | [string, [string, string[]][]][];

    if (!raw) {
      return [];
    }

    const out: RedisStreamEntry[] = [];
    for (const [, entries] of raw) {
      for (const [id, fieldList] of entries) {
        const fields: Record<string, string> = {};
        for (let i = 0; i < fieldList.length; i += 2) {
          fields[fieldList[i]] = fieldList[i + 1];
        }
        out.push({ id, fields });
      }
    }
    return out;
  }

  async xAck(stream: string, group: string, ...ids: string[]): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }
    return this.client.xack(stream, group, ...ids);
  }

  async lRange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.lrange(key, start, stop);
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

    const client = new Redis({
      ...parseRedisUri(this.redisUri),
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
