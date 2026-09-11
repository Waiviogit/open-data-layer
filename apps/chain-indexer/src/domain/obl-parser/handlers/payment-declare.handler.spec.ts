import type { OdlEventContext } from '../../odl-shared';
import type { OblRepository } from '../../../repositories/obl.repository';
import { PaymentDeclareHandler } from './payment-declare.handler';
import { mockOblNotifications } from '../obl-notification.service.spec-helpers';

function ctx(creator: string): OdlEventContext {
  return {
    action: 'payment_declare',
    creator,
    blockNum: 1,
    transactionIndex: 0,
    operationIndex: 0,
    odlEventIndex: 0,
    transactionId: 'tx-declare',
    timestamp: '2026-01-01T00:00:00.000Z',
    eventSeq: BigInt(60),
    eventIdIndexMap: new Map(),
  };
}

const declarePayload = {
  payment_id: 'pay-1',
  payer: 'bob',
  receiver: 'alice',
  amount_usd: '10',
};

describe('PaymentDeclareHandler', () => {
  it('emits obl_payment_declare after insert with pending state', async () => {
    const insertPayment = jest.fn().mockResolvedValue(undefined);
    const oblNotifications = mockOblNotifications();
    const handler = new PaymentDeclareHandler(
      {
        findPayment: jest.fn().mockResolvedValue(null),
        findLedgerStartedSeq: jest.fn().mockResolvedValue(BigInt(10)),
        insertPayment,
      } as unknown as OblRepository,
      oblNotifications.service,
    );

    await handler.handle(declarePayload, ctx('bob'));

    expect(insertPayment).toHaveBeenCalled();
    expect(oblNotifications.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: 'obl_payment_declare',
        actor: 'bob',
        payload: expect.objectContaining({
          paymentId: 'pay-1',
          payer: 'bob',
          receiver: 'alice',
          amountUsd: '10.00000000',
          state: 'pending',
        }),
      }),
    );
  });

  it('does not emit when payment already exists', async () => {
    const insertPayment = jest.fn();
    const oblNotifications = mockOblNotifications();
    const handler = new PaymentDeclareHandler(
      {
        findPayment: jest.fn().mockResolvedValue({ payment_id: 'pay-1' }),
        findLedgerStartedSeq: jest.fn(),
        insertPayment,
      } as unknown as OblRepository,
      oblNotifications.service,
    );

    await handler.handle(declarePayload, ctx('bob'));

    expect(insertPayment).not.toHaveBeenCalled();
    expect(oblNotifications.emit).not.toHaveBeenCalled();
  });
});
