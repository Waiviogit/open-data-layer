import { NotificationEmitterService } from '../notification-adapter/notification-emitter.service';
import type { OdlEventContext } from '../odl-shared';
import { OblNotificationService } from './obl-notification.service';

describe('OblNotificationService', () => {
  it('emits with odl context and objectId null', () => {
    const emitWithContext = jest.fn();
    const odlContext = jest.fn().mockReturnValue({
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: 'tx-1',
    });
    const service = new OblNotificationService({
      emitWithContext,
      odlContext,
    } as unknown as NotificationEmitterService);

    const ctx = { creator: 'alice' } as OdlEventContext;
    service.emit(ctx, {
      type: 'obl_contract_sign',
      objectId: null,
      actor: 'bob',
      payload: {
        contractId: 'c-1',
        offerId: 'offer-1',
        provider: 'alice',
        client: 'bob',
        signer: 'bob',
      },
    });

    expect(odlContext).toHaveBeenCalledWith(ctx);
    expect(emitWithContext).toHaveBeenCalledWith(
      {
        occurredAt: '2026-01-01T00:00:00.000Z',
        blockNum: 1,
        trxId: 'tx-1',
      },
      {
        type: 'obl_contract_sign',
        objectId: null,
        actor: 'bob',
        payload: {
          contractId: 'c-1',
          offerId: 'offer-1',
          provider: 'alice',
          client: 'bob',
          signer: 'bob',
        },
      },
    );
  });
});
