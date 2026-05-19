import type { NotificationEvent } from '@opden-data-layer/notifications-contract';
import {
  NOTIFICATION_STREAM_DATA_FIELD,
  NOTIFICATION_STREAM_KEY,
} from '../../../constants/notification-stream.constants';
import { RedisStreamNotificationPublisher } from './redis-stream.publisher';

describe('RedisStreamNotificationPublisher', () => {
  it('xAdds serialized event to the notification stream', async () => {
    const xAdd = jest.fn().mockResolvedValue('1-0');
    const redisFactory = {
      getClient: jest.fn(() => ({ xAdd })),
    } as unknown as import('@opden-data-layer/clients').RedisClientFactory;

    const publisher = new RedisStreamNotificationPublisher(redisFactory);
    const event: NotificationEvent = {
      type: 'trx_processed',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: 'trx',
      objectId: null,
      actor: null,
      payload: {},
    };

    await publisher.publish(event);

    expect(xAdd).toHaveBeenCalledWith(NOTIFICATION_STREAM_KEY, {
      [NOTIFICATION_STREAM_DATA_FIELD]: JSON.stringify(event),
    });
  });
});
