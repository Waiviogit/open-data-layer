import type { OdlEventContext } from '../../odl-shared';
import type { OblRepository } from '../../../repositories/obl.repository';
import type { ObjectsCoreRepository } from '../../../repositories';
import { OfferUpdateHandler } from './offer-update.handler';
import { OblOffer } from '@opden-data-layer/odl-db-types';
import { mockOblNotifications } from '../obl-notification.service.spec-helpers';

const latestOffer: OblOffer = {
  offer_id: 'offer-1',
  version: 1,
  kind: 'offer',
  author: 'alice',
  name: 'API',
  description: null,
  tags: [],
  service_ref: null,
  legal_ref: null,
  terms: {},
  dispute_rule: 'client',
  arbiter: 'carol',
  status: 'active',
  created_event_seq: BigInt(1),
  transaction_id: 'tx-offer',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
};

function ctx(creator: string): OdlEventContext {
  return {
    action: 'offer_update',
    creator,
    blockNum: 1,
    transactionIndex: 0,
    operationIndex: 0,
    odlEventIndex: 0,
    transactionId: 'tx-update',
    timestamp: '2026-01-01T00:00:00.000Z',
    eventSeq: BigInt(20),
    eventIdIndexMap: new Map(),
  };
}

describe('OfferUpdateHandler', () => {
  it('emits obl_offer_update after inserting next version', async () => {
    const insertOffer = jest.fn().mockResolvedValue(undefined);
    const oblNotifications = mockOblNotifications();
    const handler = new OfferUpdateHandler(
      {
        findLatestOffer: jest.fn().mockResolvedValue(latestOffer),
        insertOffer,
      } as unknown as OblRepository,
      { findByObjectId: jest.fn() } as unknown as ObjectsCoreRepository,
      oblNotifications.service,
    );

    await handler.handle(
      { offer_id: 'offer-1', author: 'alice', name: 'API v2' },
      ctx('alice'),
    );

    expect(insertOffer).toHaveBeenCalled();
    expect(oblNotifications.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: 'obl_offer_update',
        actor: 'alice',
        payload: expect.objectContaining({
          offerId: 'offer-1',
          version: 2,
          kind: 'offer',
          name: 'API v2',
          author: 'alice',
          arbiter: 'carol',
        }),
      }),
    );
  });

  it('does not emit when offer is not found', async () => {
    const insertOffer = jest.fn();
    const oblNotifications = mockOblNotifications();
    const handler = new OfferUpdateHandler(
      {
        findLatestOffer: jest.fn().mockResolvedValue(null),
        insertOffer,
      } as unknown as OblRepository,
      { findByObjectId: jest.fn() } as unknown as ObjectsCoreRepository,
      oblNotifications.service,
    );

    await handler.handle(
      { offer_id: 'missing', author: 'alice' },
      ctx('alice'),
    );

    expect(insertOffer).not.toHaveBeenCalled();
    expect(oblNotifications.emit).not.toHaveBeenCalled();
  });
});
