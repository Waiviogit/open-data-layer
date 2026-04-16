import { ConfigService } from '@nestjs/config';
import { RedisClientFactory } from '@opden-data-layer/clients';
import {
  DEFAULT_GOVERNANCE_SNAPSHOT,
  type GovernanceSnapshot,
} from '@opden-data-layer/objects-domain';
import { GovernanceCacheService } from './governance-cache.service';
import { GovernanceObjectMutatedEvent } from './governance-object-mutated.event';
import { GovernanceResolverService } from './governance-resolver.service';

const customSnapshot: GovernanceSnapshot = {
  ...DEFAULT_GOVERNANCE_SNAPSHOT,
  admins: ['a'],
};

describe('GovernanceCacheService', () => {
  it('resolvePlatform returns DEFAULT when governance.objectId is empty', async () => {
    const config = {
      get: jest.fn((key: string) => (key === 'governance.objectId' ? '' : undefined)),
    } as unknown as ConfigService;
    const governanceResolver = {
      resolve: jest.fn(),
    } as unknown as GovernanceResolverService;
    const redis = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
    const redisFactory = {
      getClient: jest.fn().mockReturnValue(redis),
    } as unknown as RedisClientFactory;

    const service = new GovernanceCacheService(governanceResolver, redisFactory, config);
    const result = await service.resolvePlatform();

    expect(result).toEqual(DEFAULT_GOVERNANCE_SNAPSHOT);
    expect(redisFactory.getClient).not.toHaveBeenCalled();
    expect(governanceResolver.resolve).not.toHaveBeenCalled();
  });

  it('resolve loads from resolver and sets Redis on cache miss', async () => {
    const config = {
      get: jest.fn((key: string) => (key === 'governance.objectId' ? 'gov-obj' : undefined)),
    } as unknown as ConfigService;
    const governanceResolver = {
      resolve: jest.fn().mockResolvedValue(customSnapshot),
    } as unknown as GovernanceResolverService;
    const redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn(), del: jest.fn() };
    const redisFactory = {
      getClient: jest.fn().mockReturnValue(redis),
    } as unknown as RedisClientFactory;

    const service = new GovernanceCacheService(governanceResolver, redisFactory, config);
    const result = await service.resolve('gov-obj');

    expect(result).toEqual(customSnapshot);
    expect(governanceResolver.resolve).toHaveBeenCalledWith('gov-obj');
    expect(redis.set).toHaveBeenCalledWith(
      'chain-indexer:cache:governance:snapshot:gov-obj',
      JSON.stringify(customSnapshot),
      60,
    );
  });

  it('resolve returns snapshot from Redis on cache hit', async () => {
    const config = { get: jest.fn() } as unknown as ConfigService;
    const governanceResolver = {
      resolve: jest.fn(),
    } as unknown as GovernanceResolverService;
    const redis = {
      get: jest.fn().mockResolvedValue(JSON.stringify(customSnapshot)),
      set: jest.fn(),
      del: jest.fn(),
    };
    const redisFactory = {
      getClient: jest.fn().mockReturnValue(redis),
    } as unknown as RedisClientFactory;

    const service = new GovernanceCacheService(governanceResolver, redisFactory, config);
    const result = await service.resolve('gov-obj');

    expect(result).toEqual(customSnapshot);
    expect(governanceResolver.resolve).not.toHaveBeenCalled();
  });

  it('invalidate deletes redis key', async () => {
    const config = { get: jest.fn() } as unknown as ConfigService;
    const governanceResolver = {
      resolve: jest.fn(),
    } as unknown as GovernanceResolverService;
    const redis = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
    const redisFactory = {
      getClient: jest.fn().mockReturnValue(redis),
    } as unknown as RedisClientFactory;

    const service = new GovernanceCacheService(governanceResolver, redisFactory, config);
    await service.invalidate('gov-obj');

    expect(redis.del).toHaveBeenCalledWith(
      'chain-indexer:cache:governance:snapshot:gov-obj',
    );
  });

  it('handleGovernanceObjectMutated delegates to invalidate', async () => {
    const config = { get: jest.fn() } as unknown as ConfigService;
    const governanceResolver = {
      resolve: jest.fn(),
    } as unknown as GovernanceResolverService;
    const redis = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
    const redisFactory = {
      getClient: jest.fn().mockReturnValue(redis),
    } as unknown as RedisClientFactory;

    const service = new GovernanceCacheService(governanceResolver, redisFactory, config);
    await service.handleGovernanceObjectMutated(new GovernanceObjectMutatedEvent('gov-obj'));

    expect(redis.del).toHaveBeenCalledWith(
      'chain-indexer:cache:governance:snapshot:gov-obj',
    );
  });
});
