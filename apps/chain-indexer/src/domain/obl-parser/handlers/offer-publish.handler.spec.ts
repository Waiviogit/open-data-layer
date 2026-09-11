import type { OdlEventContext } from '../../odl-shared';
import type { OblRepository } from '../../../repositories/obl.repository';
import type { ObjectsCoreRepository } from '../../../repositories';
import { OfferPublishHandler } from './offer-publish.handler';
import { mockOblNotifications } from '../obl-notification.service.spec-helpers';

const publishPayload = {
  offer_id: 'offer-1',
  author: 'alice',
  kind: 'offer' as const,
  name: 'API',
  terms: {},
  dispute_rule: 'client' as const,
  arbiter: 'carol',
};

function ctx(creator: string): OdlEventContext {
  return {
    action: 'offer_publish',
    creator,
    blockNum: 1,
    transactionIndex: 0,
    operationIndex: 0,
    odlEventIndex: 0,
    transactionId: 'tx-publish',
    timestamp: '2026-01-01T00:00:00.000Z',
    eventSeq: BigInt(10),
    eventIdIndexMap: new Map(),
  };
}

describe('OfferPublishHandler', () => {
  it('emits obl_offer_publish after insert with version 1', async () => {
    const insertOffer = jest.fn().mockResolvedValue(undefined);
    const oblNotifications = mockOblNotifications();
    const handler = new OfferPublishHandler(
      {
        findLatestOffer: jest.fn().mockResolvedValue(null),
        insertOffer,
      } as unknown as OblRepository,
      { findByObjectId: jest.fn() } as unknown as ObjectsCoreRepository,
      oblNotifications.service,
    );

    await handler.handle(publishPayload, ctx('alice'));

    expect(insertOffer).toHaveBeenCalled();
    expect(oblNotifications.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: 'obl_offer_publish',
        actor: 'alice',
        payload: expect.objectContaining({
          offerId: 'offer-1',
          version: 1,
          kind: 'offer',
          name: 'API',
          author: 'alice',
          arbiter: 'carol',
        }),
      }),
    );
  });

  it('does not emit when creator mismatches author', async () => {
    const insertOffer = jest.fn();
    const oblNotifications = mockOblNotifications();
    const handler = new OfferPublishHandler(
      {
        findLatestOffer: jest.fn(),
        insertOffer,
      } as unknown as OblRepository,
      { findByObjectId: jest.fn() } as unknown as ObjectsCoreRepository,
      oblNotifications.service,
    );

    await handler.handle(publishPayload, ctx('bob'));

    expect(insertOffer).not.toHaveBeenCalled();
    expect(oblNotifications.emit).not.toHaveBeenCalled();
  });
});
