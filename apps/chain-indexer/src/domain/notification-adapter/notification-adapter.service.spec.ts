import { NotificationAdapterService } from './notification-adapter.service';
import {
  FollowNotificationPayload,
  ObjectCreatedNotificationPayload,
  TrxProcessedNotificationPayload,
  VoteCastNotificationPayload,
} from './events/notification-domain-events';
import { InMemoryNotificationPublisher } from './publishers/in-memory.publisher';

describe('NotificationAdapterService', () => {
  let publisher: InMemoryNotificationPublisher;
  let service: NotificationAdapterService;

  beforeEach(() => {
    publisher = new InMemoryNotificationPublisher();
    service = new NotificationAdapterService(publisher);
  });

  it('maps vote cast domain event to contract shape', async () => {
    await service.onVoteCast(
      new VoteCastNotificationPayload(
        'obj-1',
        'upd-1',
        'voter',
        'for',
        100,
        'trx-1',
        '2026-01-01T00:00:00.000Z',
      ),
    );

    expect(publisher.published).toHaveLength(1);
    expect(publisher.published[0]).toEqual({
      type: 'update_vote_cast',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 100,
      trxId: 'trx-1',
      objectId: 'obj-1',
      actor: 'voter',
      payload: { updateId: 'upd-1', vote: 'for' },
    });
  });

  it('maps follow domain event to contract shape', async () => {
    await service.onFollow(
      new FollowNotificationPayload(
        'alice',
        'bob',
        'follow',
        1,
        'trx-f',
        '2026-01-01T00:00:00.000Z',
      ),
    );

    expect(publisher.published[0]).toMatchObject({
      type: 'follow',
      actor: 'alice',
      payload: { following: 'bob', action: 'follow' },
    });
  });

  it('maps object created and trx processed events', async () => {
    await service.onObjectCreated(
      new ObjectCreatedNotificationPayload(
        'obj',
        'upd',
        'name',
        'creator',
        2,
        'trx-o',
        '2026-01-01T00:00:00.000Z',
      ),
    );
    await service.onTrxProcessed(
      new TrxProcessedNotificationPayload('trx-o', 2, '2026-01-01T00:00:00.000Z'),
    );

    expect(publisher.published[0].type).toBe('object_created');
    expect(publisher.published[1]).toEqual({
      type: 'trx_processed',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 2,
      trxId: 'trx-o',
      objectId: null,
      actor: null,
      payload: {},
    });
  });
});
