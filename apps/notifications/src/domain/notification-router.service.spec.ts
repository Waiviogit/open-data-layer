import type { NotificationEvent } from '@opden-data-layer/notifications-contract';
import { NotificationRouterService } from './notification-router.service';
import type { NotificationFeedService } from './notification-feed.service';
import type { NotificationRecipientsRepository } from '../repositories/notification-recipients.repository';
import type { SubscriptionService } from '../ws/subscription.service';

describe('NotificationRouterService', () => {
  const feedService = {
    buildItemFromEvent: jest.fn((e: NotificationEvent) => ({ id: '1', ...e })),
    addToFeed: jest.fn(),
  } as unknown as NotificationFeedService;

  const recipientsRepository = {
    findObjectCreator: jest.fn(),
    findAdministrativeAuthorities: jest.fn(),
    findBellFollowers: jest.fn(),
  } as unknown as NotificationRecipientsRepository;

  const subscriptionService = {
    notifyTrxProcessed: jest.fn(),
  } as unknown as SubscriptionService;

  let router: NotificationRouterService;

  beforeEach(() => {
    jest.clearAllMocks();
    router = new NotificationRouterService(
      recipientsRepository,
      feedService,
      subscriptionService,
    );
  });

  it('skips object_created', async () => {
    await router.route({
      type: 'object_created',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: 't',
      objectId: 'o',
      actor: 'a',
      payload: {},
    });
    expect(feedService.addToFeed).not.toHaveBeenCalled();
  });

  it('routes follow to following account', async () => {
    await router.route({
      type: 'follow',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: 't',
      objectId: null,
      actor: 'alice',
      payload: { following: 'bob' },
    });
    expect(feedService.addToFeed).toHaveBeenCalledWith('bob', expect.any(Object));
  });

  it('routes update_vote_cast to creator, authorities, and bell followers excluding actor', async () => {
    (recipientsRepository.findObjectCreator as jest.Mock).mockResolvedValue(
      'creator',
    );
    (recipientsRepository.findAdministrativeAuthorities as jest.Mock).mockResolvedValue(
      ['admin1', 'voter'],
    );
    (recipientsRepository.findBellFollowers as jest.Mock).mockResolvedValue([
      'bellUser',
    ]);

    await router.route({
      type: 'update_vote_cast',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: 't',
      objectId: 'obj-1',
      actor: 'voter',
      payload: { vote: 'valid' },
    });

    expect(feedService.addToFeed).toHaveBeenCalledTimes(3);
    expect(feedService.addToFeed).toHaveBeenCalledWith(
      'creator',
      expect.any(Object),
    );
    expect(feedService.addToFeed).toHaveBeenCalledWith(
      'admin1',
      expect.any(Object),
    );
    expect(feedService.addToFeed).toHaveBeenCalledWith(
      'bellUser',
      expect.any(Object),
    );
  });

  it('notifies trx subscribers', async () => {
    await router.route({
      type: 'trx_processed',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: 'trx-abc',
      objectId: null,
      actor: null,
      payload: {},
    });
    expect(subscriptionService.notifyTrxProcessed).toHaveBeenCalledWith(
      'trx-abc',
      expect.objectContaining({ blockNum: 1 }),
    );
  });
});
