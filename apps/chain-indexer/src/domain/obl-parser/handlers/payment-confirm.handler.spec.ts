import type { OdlEventContext } from '../../odl-shared';
import type { OblRepository } from '../../../repositories/obl.repository';
import { PaymentConfirmHandler } from './payment-confirm.handler';
import { OblPayment } from '@opden-data-layer/odl-db-types';
import { mockOblNotifications } from '../obl-notification.service.spec-helpers';

const pendingPayment: OblPayment = {
  payment_id: 'pay-declare',
  payer: 'bob',
  receiver: 'alice',
  amount_usd: '100.00000000',
  declared_amount_usd: '100.00000000',
  method: 'offchain',
  token_symbol: null,
  token_amount: null,
  rate_usd: null,
  state: 'pending',
  ref: null,
  pair_low: 'alice',
  pair_high: 'bob',
  created_event_seq: BigInt(50),
  transaction_id: 'tx-declare',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
};

function ctx(): OdlEventContext {
  return {
    action: 'payment_confirm',
    creator: 'alice',
    blockNum: 1,
    transactionIndex: 0,
    operationIndex: 0,
    odlEventIndex: 0,
    transactionId: 'tx-confirm',
    timestamp: '2026-01-01T00:00:00.000Z',
    eventSeq: BigInt(60),
    eventIdIndexMap: new Map(),
  };
}

describe('PaymentConfirmHandler', () => {
  it('skips when declare payment is already confirmed', async () => {
    const findPayment = jest.fn().mockResolvedValue({
      ...pendingPayment,
      state: 'confirmed',
    });
    const updatePayment = jest.fn();
    const oblNotifications = mockOblNotifications();

    const handler = new PaymentConfirmHandler(
      {
        findPayment,
        updatePayment,
      } as unknown as OblRepository,
      oblNotifications.service,
    );

    await handler.handle(
      {
        payment_id: 'pay-confirm',
        receiver: 'alice',
        amount_usd: '50',
        declare_payment_id: 'pay-declare',
      },
      ctx(),
    );

    expect(updatePayment).not.toHaveBeenCalled();
    expect(oblNotifications.emit).not.toHaveBeenCalled();
  });

  it('confirms declare row with partial amount and does not insert remainder', async () => {
    const findPayment = jest.fn().mockResolvedValue(pendingPayment);
    const updatePayment = jest.fn().mockResolvedValue(undefined);
    const insertPayment = jest.fn().mockResolvedValue(undefined);

    const oblNotifications = mockOblNotifications();
    const handler = new PaymentConfirmHandler({
      findPayment,
      updatePayment,
      insertPayment,
    } as unknown as OblRepository, oblNotifications.service);

    await handler.handle(
      {
        payment_id: 'pay-confirm',
        receiver: 'alice',
        amount_usd: '40',
        declare_payment_id: 'pay-declare',
      },
      ctx(),
    );

    expect(updatePayment).toHaveBeenCalledWith('pay-declare', {
      state: 'confirmed',
      amount_usd: '40.00000000',
    });
    expect(insertPayment).not.toHaveBeenCalled();
    expect(oblNotifications.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: 'obl_payment_confirm',
        actor: 'alice',
        payload: expect.objectContaining({
          paymentId: 'pay-declare',
          payer: 'bob',
          receiver: 'alice',
          amountUsd: '40.00000000',
          state: 'confirmed',
        }),
      }),
    );
  });

  it('confirms declare row with over-amount and does not insert excess row', async () => {
    const findPayment = jest.fn().mockResolvedValue(pendingPayment);
    const updatePayment = jest.fn().mockResolvedValue(undefined);
    const insertPayment = jest.fn().mockResolvedValue(undefined);

    const handler = new PaymentConfirmHandler({
      findPayment,
      updatePayment,
      insertPayment,
    } as unknown as OblRepository, mockOblNotifications().service);

    await handler.handle(
      {
        payment_id: 'pay-confirm',
        receiver: 'alice',
        amount_usd: '150',
        declare_payment_id: 'pay-declare',
      },
      ctx(),
    );

    expect(updatePayment).toHaveBeenCalledWith('pay-declare', {
      state: 'confirmed',
      amount_usd: '150.00000000',
    });
    expect(insertPayment).not.toHaveBeenCalled();
  });

  it('stores user ref on receiver-only confirm', async () => {
    const findPayment = jest.fn().mockResolvedValue(null);
    const findLedgerStartedSeq = jest.fn().mockResolvedValue(BigInt(10));
    const insertPayment = jest.fn().mockResolvedValue(undefined);

    const oblNotifications = mockOblNotifications();
    const handler = new PaymentConfirmHandler({
      findPayment,
      findLedgerStartedSeq,
      insertPayment,
    } as unknown as OblRepository, oblNotifications.service);

    await handler.handle(
      {
        payment_id: 'pay-recv-only',
        receiver: 'alice',
        payer: 'bob',
        amount_usd: '25',
        ref: { note: 'Cash received' },
      },
      ctx(),
    );

    expect(insertPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_id: 'pay-recv-only',
        state: 'confirmed',
        ref: {
          receiver_only_confirm: true,
          note: 'Cash received',
        },
      }),
    );
    expect(oblNotifications.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: 'obl_payment_confirm',
        actor: 'alice',
        payload: expect.objectContaining({
          paymentId: 'pay-recv-only',
          payer: 'bob',
          receiver: 'alice',
          amountUsd: '25.00000000',
          state: 'confirmed',
        }),
      }),
    );
  });
});
