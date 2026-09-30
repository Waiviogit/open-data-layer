import type { OdlEventContext } from '../../odl-shared';
import type { OblRepository } from '../../../repositories/obl.repository';
import { ServiceOrderCancelHandler } from './service-order-cancel.handler';
import { mockOblNotifications } from '../obl-notification.service.spec-helpers';

const activeOrder = {
  service_order_id: 'so-1',
  contract_id: 'c-1',
  creator: 'alice',
  provider: 'alice',
  client: 'bob',
  status: 'active' as const,
  cancelled_by: null,
};

function ctx(creator: string): OdlEventContext {
  return {
    action: 'service_order_cancel',
    creator,
    blockNum: 1,
    transactionIndex: 0,
    operationIndex: 0,
    odlEventIndex: 0,
    transactionId: 'tx-cancel',
    timestamp: '2026-01-02T00:00:00.000Z',
    eventSeq: BigInt(200),
    eventIdIndexMap: new Map(),
  };
}

describe('ServiceOrderCancelHandler', () => {
  let findServiceOrder: jest.Mock;
  let cancelServiceOrder: jest.Mock;
  let oblNotifications: ReturnType<typeof mockOblNotifications>;
  let handler: ServiceOrderCancelHandler;

  beforeEach(() => {
    findServiceOrder = jest.fn().mockResolvedValue(activeOrder);
    cancelServiceOrder = jest.fn().mockResolvedValue(undefined);
    oblNotifications = mockOblNotifications();
    handler = new ServiceOrderCancelHandler(
      {
        findServiceOrder,
        cancelServiceOrder,
      } as unknown as OblRepository,
      oblNotifications.service,
    );
  });

  it('records provider signer as cancelled_by', async () => {
    await handler.handle({ service_order_id: 'so-1' }, ctx('alice'));

    expect(cancelServiceOrder).toHaveBeenCalledWith(
      'so-1',
      expect.objectContaining({
        cancelled_by: 'alice',
        cancelled_transaction_id: 'tx-cancel',
        cancelled_event_seq: BigInt(200),
      }),
    );
    expect(oblNotifications.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: 'obl_service_order_cancel',
        actor: 'alice',
        payload: expect.objectContaining({
          serviceOrderId: 'so-1',
          canceller: 'alice',
          provider: 'alice',
          client: 'bob',
        }),
      }),
    );
  });

  it('records client signer as cancelled_by', async () => {
    await handler.handle({ service_order_id: 'so-1' }, ctx('bob'));

    expect(cancelServiceOrder).toHaveBeenCalledWith(
      'so-1',
      expect.objectContaining({ cancelled_by: 'bob' }),
    );
    expect(oblNotifications.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: 'obl_service_order_cancel',
        actor: 'bob',
        payload: expect.objectContaining({ canceller: 'bob' }),
      }),
    );
  });

  it('rejects a non-party signer', async () => {
    await handler.handle({ service_order_id: 'so-1' }, ctx('carol'));

    expect(cancelServiceOrder).not.toHaveBeenCalled();
    expect(oblNotifications.emit).not.toHaveBeenCalled();
  });

  it('skips when service order is missing', async () => {
    findServiceOrder.mockResolvedValue(null);
    await handler.handle({ service_order_id: 'so-missing' }, ctx('alice'));

    expect(cancelServiceOrder).not.toHaveBeenCalled();
    expect(oblNotifications.emit).not.toHaveBeenCalled();
  });

  it('is a no-op when already cancelled', async () => {
    findServiceOrder.mockResolvedValue({
      ...activeOrder,
      status: 'cancelled',
      cancelled_by: 'alice',
    });
    await handler.handle({ service_order_id: 'so-1' }, ctx('bob'));

    expect(cancelServiceOrder).not.toHaveBeenCalled();
    expect(oblNotifications.emit).not.toHaveBeenCalled();
  });

  it('cancels even when reports or invoices already reference the order', async () => {
    await handler.handle({ service_order_id: 'so-1' }, ctx('alice'));

    expect(cancelServiceOrder).toHaveBeenCalled();
    expect(oblNotifications.emit).toHaveBeenCalled();
  });

  it('ignores stray canceller in JSON and persists the signer', async () => {
    await handler.handle(
      { service_order_id: 'so-1', canceller: 'mallory' },
      ctx('alice'),
    );

    expect(cancelServiceOrder).toHaveBeenCalledWith(
      'so-1',
      expect.objectContaining({ cancelled_by: 'alice' }),
    );
    expect(cancelServiceOrder).not.toHaveBeenCalledWith(
      'so-1',
      expect.objectContaining({ cancelled_by: 'mallory' }),
    );
  });

  it('skips invalid empty service_order_id', async () => {
    await handler.handle({ service_order_id: '' }, ctx('alice'));

    expect(findServiceOrder).not.toHaveBeenCalled();
    expect(cancelServiceOrder).not.toHaveBeenCalled();
    expect(oblNotifications.emit).not.toHaveBeenCalled();
  });
});
