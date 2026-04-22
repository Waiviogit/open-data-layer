export interface RedisPipelineInterface {
  hSet(key: string, field: string, value: string | number): this;
  hIncrBy(key: string, field: string, increment: number): this;
  expire(key: string, ttlSeconds: number): this;
  exec(): Promise<void>;
}

export interface RedisClientInterface {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  /**
   * Sets key to value with TTL only if the key does not exist (SET ... NX EX).
   * @returns true if the key was set
   */
  trySetNx(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean>;
  /**
   * Deletes the key only if its value matches `expectedValue` (for lock release by token).
   * @returns true if the key was deleted
   */
  releaseLockIfValue(key: string, expectedValue: string): Promise<boolean>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  hGet(key: string, field: string): Promise<string | null>;
  hSet(key: string, field: string, value: string | number): Promise<void>;
  hGetAll(key: string): Promise<Record<string, string>>;
  hIncrBy(key: string, field: string, increment: number): Promise<void>;
  expire(key: string, ttlSeconds: number): Promise<void>;
  zIncrBy(key: string, increment: number, member: string): Promise<number>;
  pipeline(): RedisPipelineInterface;
  publish(channel: string, message: string): Promise<void>;
}

export interface RedisClientFactoryInterface {
  getClient(db?: number): RedisClientInterface;
}
