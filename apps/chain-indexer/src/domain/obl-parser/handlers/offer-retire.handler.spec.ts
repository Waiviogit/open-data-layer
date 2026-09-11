import type { OdlEventContext } from '../../odl-shared';
import type { OblRepository } from '../../../repositories/obl.repository';
import { OfferRetireHandler } from './offer-retire.handler';
import { OblOffer } from '@opden-data-layer/odl-db-types';
import { mockOblNotifications } from '../obl-notification.service.spec-helpers';

describe('OfferRetireHandler', () => {
  it('retires all versions for offer_id', async () => {
    const retireAllOfferVersions = jest.fn().mockResolvedValue(undefined);
    const findLatestOffer = jest.fn().mockResolvedValue({
      offer_id: 'offer-1',
      version: 2,
      author: 'alice',
      status: 'active',
      kind: 'offer',
      name: 'API',
    } satisfies Partial<OblOffer>);

    const oblNotifications = mockOblNotifications();
    const handler = new OfferRetireHandler(
      {
        findLatestOffer,
        retireAllOfferVersions,
      } as unknown as OblRepository,
      oblNotifications.service,
    );

    await handler.handle(
      { offer_id: 'offer-1', author: 'alice' },
      {
        creator: 'alice',
      } as OdlEventContext,
    );

    expect(retireAllOfferVersions).toHaveBeenCalledWith('offer-1');
    expect(oblNotifications.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: 'obl_offer_retire',
        actor: 'alice',
      }),
    );
  });

  it('does not emit when offer is already retired', async () => {
    const retireAllOfferVersions = jest.fn();
    const oblNotifications = mockOblNotifications();
    const handler = new OfferRetireHandler(
      {
        findLatestOffer: jest.fn().mockResolvedValue({
          offer_id: 'offer-1',
          version: 2,
          author: 'alice',
          status: 'retired',
          kind: 'offer',
          name: 'API',
        } satisfies Partial<OblOffer>),
        retireAllOfferVersions,
      } as unknown as OblRepository,
      oblNotifications.service,
    );

    await handler.handle(
      { offer_id: 'offer-1', author: 'alice' },
      {
        creator: 'alice',
      } as OdlEventContext,
    );

    expect(retireAllOfferVersions).not.toHaveBeenCalled();
    expect(oblNotifications.emit).not.toHaveBeenCalled();
  });
});
