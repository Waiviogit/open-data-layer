import type { RedisClientInterface } from '@opden-data-layer/clients';
import {
  NOTIFICATION_EXPIRY_SEC,
  NOTIFICATION_LIST_MAX,
  notificationListKey,
} from '../constants/notification-feed.constants';
import { ConnectionRegistryService } from '../ws/connection-registry.service';
import { NotificationFeedService } from './notification-feed.service';

describe('NotificationFeedService', () => {
  const pipe = {
    lPush: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    lTrim: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(undefined),
  };

  const redis: RedisClientInterface = {
    pipeline: jest.fn(() => pipe),
    lRange: jest.fn(),
  } as unknown as RedisClientInterface;

  const redisFactory = {
    getClient: jest.fn(() => redis),
  } as unknown as import('@opden-data-layer/clients').RedisClientFactory;

  const connectionRegistry = {
    getSocketsForUser: jest.fn(() => new Set()),
  } as unknown as ConnectionRegistryService;

  let service: NotificationFeedService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationFeedService(redisFactory, connectionRegistry);
  });

  it('addToFeed runs LPUSH, EXPIRE, and LTRIM in a pipeline', async () => {
    const item = service.buildItemFromEvent({
      type: 'follow',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: 't',
      objectId: null,
      actor: 'alice',
      payload: { following: 'bob' },
    });

    await service.addToFeed('bob', item);

    expect(pipe.lPush).toHaveBeenCalledWith(
      notificationListKey('bob'),
      JSON.stringify(item),
    );
    expect(pipe.expire).toHaveBeenCalledWith(
      notificationListKey('bob'),
      NOTIFICATION_EXPIRY_SEC,
    );
    expect(pipe.lTrim).toHaveBeenCalledWith(
      notificationListKey('bob'),
      0,
      NOTIFICATION_LIST_MAX - 1,
    );
    expect(pipe.exec).toHaveBeenCalled();
  });

  it('getFeed parses list entries and skips corrupt JSON', async () => {
    const valid = service.buildItemFromEvent({
      type: 'follow',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: null,
      actor: 'a',
      payload: {},
    });
    (redis.lRange as jest.Mock).mockResolvedValue([
      JSON.stringify(valid),
      'not-json',
    ]);

    const items = await service.getFeed('alice');

    expect(redis.lRange).toHaveBeenCalledWith(notificationListKey('alice'), 0, -1);
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('follow');
  });

  it('getFeed returns empty array when Redis fails', async () => {
    (redis.lRange as jest.Mock).mockRejectedValue(new Error('redis down'));

    const items = await service.getFeed('alice');

    expect(items).toEqual([]);
  });
});
