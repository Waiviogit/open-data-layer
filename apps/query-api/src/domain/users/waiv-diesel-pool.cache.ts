import { Injectable, Logger } from '@nestjs/common';
import { HiveEngineClient, RedisClientFactory } from '@opden-data-layer/clients';
import { WAIV_TOKEN } from '@opden-data-layer/core';

import { WAIV_DIESEL_POOL_CACHE_TTL_SEC } from '../../constants/cache.constants';
import { redisKey } from '../../constants/redis-keys';

@Injectable()
export class WaivDieselPoolCache {
  private readonly logger = new Logger(WaivDieselPoolCache.name);

  constructor(
    private readonly hiveEngineClient: HiveEngineClient,
    private readonly redisFactory: RedisClientFactory,
  ) {}

  async getQuotePriceHive(): Promise<number> {
    const key = redisKey.waivDieselPool();
    const redis = this.redisFactory.getClient(0);
    try {
      const cached = await redis.get(key);
      if (cached) {
        const price = Number.parseFloat(cached);
        if (Number.isFinite(price) && price >= 0) {
          return price;
        }
      }
    } catch (e) {
      this.logger.warn(
        `waiv diesel pool cache read failed: ${(e as Error).message}`,
      );
    }

    const pool = await this.hiveEngineClient.findOneMarketPool({
      _id: WAIV_TOKEN.DIESEL_POOL_ID,
    });
    const parsed = Number.parseFloat(pool?.quotePrice ?? '0');
    const quotePriceHive = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;

    try {
      await redis.set(key, String(quotePriceHive), WAIV_DIESEL_POOL_CACHE_TTL_SEC);
    } catch (e) {
      this.logger.warn(
        `waiv diesel pool cache write failed: ${(e as Error).message}`,
      );
    }
    return quotePriceHive;
  }
}
