import type { RedisClientInterface } from '@opden-data-layer/clients';
import {
  NOTIFICATION_CONSUMER_GROUP,
  NOTIFICATION_STREAM_DATA_FIELD,
  NOTIFICATION_STREAM_KEY,
} from '../constants/notification-stream.constants';
import type { NotificationRouterService } from '../domain/notification-router.service';
import { RedisStreamNotificationConsumer } from './redis-stream.consumer';

function processEntry(
  consumer: RedisStreamNotificationConsumer,
  entryId: string,
  fields: Record<string, string>,
): Promise<void> {
  return (
    consumer as unknown as {
      processEntry(id: string, f: Record<string, string>): Promise<void>;
    }
  ).processEntry(entryId, fields);
}

describe('RedisStreamNotificationConsumer', () => {
  const redis: RedisClientInterface = {
    xGroupCreate: jest.fn().mockResolvedValue(undefined),
    xReadGroup: jest.fn().mockResolvedValue([]),
    xAck: jest.fn().mockResolvedValue(1),
  } as unknown as RedisClientInterface;

  const redisFactory = {
    getClient: jest.fn(() => redis),
  } as unknown as import('@opden-data-layer/clients').RedisClientFactory;

  const router = {
    route: jest.fn().mockResolvedValue(undefined),
  } as unknown as NotificationRouterService;

  let consumer: RedisStreamNotificationConsumer;

  beforeEach(() => {
    jest.clearAllMocks();
    consumer = new RedisStreamNotificationConsumer(redisFactory, router);
  });

  it('start creates consumer group', async () => {
    await consumer.start();
    await consumer.stop();

    expect(redis.xGroupCreate).toHaveBeenCalledWith(
      NOTIFICATION_STREAM_KEY,
      NOTIFICATION_CONSUMER_GROUP,
      '$',
      true,
    );
  });

  it('processEntry routes valid events and acks', async () => {
    const event = {
      type: 'trx_processed',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: 'trx-abc',
      objectId: null,
      actor: null,
      payload: {},
    };

    await processEntry(consumer, '1-0', {
      [NOTIFICATION_STREAM_DATA_FIELD]: JSON.stringify(event),
    });

    expect(router.route).toHaveBeenCalledWith(event);
    expect(redis.xAck).toHaveBeenCalledWith(
      NOTIFICATION_STREAM_KEY,
      NOTIFICATION_CONSUMER_GROUP,
      '1-0',
    );
  });

  it('processEntry acks entries with missing or invalid data without routing', async () => {
    await processEntry(consumer, '2-0', {});
    expect(router.route).not.toHaveBeenCalled();
    expect(redis.xAck).toHaveBeenCalledWith(
      NOTIFICATION_STREAM_KEY,
      NOTIFICATION_CONSUMER_GROUP,
      '2-0',
    );

    jest.clearAllMocks();

    await processEntry(consumer, '3-0', {
      [NOTIFICATION_STREAM_DATA_FIELD]: '{bad',
    });
    expect(router.route).not.toHaveBeenCalled();
    expect(redis.xAck).toHaveBeenCalled();
  });

  it('processEntry does not ack when routing throws', async () => {
    (router.route as jest.Mock).mockRejectedValueOnce(new Error('route failed'));

    await processEntry(consumer, '4-0', {
      [NOTIFICATION_STREAM_DATA_FIELD]: JSON.stringify({
        type: 'follow',
        occurredAt: '2026-01-01T00:00:00.000Z',
        blockNum: 1,
        trxId: 't',
        objectId: null,
        actor: 'a',
        payload: { following: 'b' },
      }),
    });

    expect(redis.xAck).not.toHaveBeenCalled();
  });
});
