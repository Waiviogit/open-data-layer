import type { HiveEngineClient, RedisClientFactory } from '@opden-data-layer/clients';

import { WAIV_DIESEL_POOL_CACHE_TTL_SEC } from '../../constants/cache.constants';
import { WaivDieselPoolCache } from './waiv-diesel-pool.cache';

describe('WaivDieselPoolCache', () => {
  const hiveEngine: jest.Mocked<Pick<HiveEngineClient, 'findOneMarketPool'>> = {
    findOneMarketPool: jest.fn(),
  };

  let redisGet: jest.Mock;
  let redisSet: jest.Mock;
  let cache: WaivDieselPoolCache;

  beforeEach(() => {
    redisGet = jest.fn().mockResolvedValue(null);
    redisSet = jest.fn().mockResolvedValue(undefined);
    const redisFactory = {
      getClient: () => ({ get: redisGet, set: redisSet }),
    } as unknown as RedisClientFactory;
    cache = new WaivDieselPoolCache(
      hiveEngine as unknown as HiveEngineClient,
      redisFactory,
    );
    jest.clearAllMocks();
    redisGet.mockResolvedValue(null);
    hiveEngine.findOneMarketPool.mockResolvedValue({
      quotePrice: '0.42',
    } as never);
  });

  it('returns the cached quote price without calling Hive Engine', async () => {
    redisGet.mockResolvedValueOnce('0.31');

    const price = await cache.getQuotePriceHive();

    expect(price).toBe(0.31);
    expect(hiveEngine.findOneMarketPool).not.toHaveBeenCalled();
  });

  it('fetches from Hive Engine on cache miss and writes Redis with TTL', async () => {
    const price = await cache.getQuotePriceHive();

    expect(price).toBe(0.42);
    expect(hiveEngine.findOneMarketPool).toHaveBeenCalledTimes(1);
    expect(redisSet).toHaveBeenCalledWith(
      expect.stringContaining('diesel-pool'),
      '0.42',
      WAIV_DIESEL_POOL_CACHE_TTL_SEC,
    );
  });

  it('fetches from Hive Engine when Redis get fails', async () => {
    redisGet.mockRejectedValueOnce(new Error('redis down'));

    const price = await cache.getQuotePriceHive();

    expect(price).toBe(0.42);
    expect(hiveEngine.findOneMarketPool).toHaveBeenCalledTimes(1);
  });

  it('returns the fetched price when Redis set fails', async () => {
    redisSet.mockRejectedValueOnce(new Error('redis down'));

    const price = await cache.getQuotePriceHive();

    expect(price).toBe(0.42);
  });

  it('treats a non-numeric cache value as a miss', async () => {
    redisGet.mockResolvedValueOnce('not-a-number');

    const price = await cache.getQuotePriceHive();

    expect(price).toBe(0.42);
    expect(hiveEngine.findOneMarketPool).toHaveBeenCalledTimes(1);
  });
});
