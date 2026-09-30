import type { OblServiceOrder } from '@opden-data-layer/odl-db-types';

import { serializeOblServiceOrder } from './obl-row-serialize';

const cancelledAt = new Date('2026-09-30T00:00:00.000Z');

const cancelledOrder: OblServiceOrder = {
  service_order_id: 'so-1',
  contract_id: 'c-1',
  creator: 'alice',
  provider: 'alice',
  client: 'bob',
  pair_low: 'alice',
  pair_high: 'bob',
  details: {},
  status: 'cancelled',
  cancelled_by: 'alice',
  cancelled_at: cancelledAt,
  cancelled_event_seq: BigInt(20),
  cancelled_transaction_id: 'tx-cancel',
  created_event_seq: BigInt(10),
  transaction_id: 'tx-so',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
};

describe('serializeOblServiceOrder', () => {
  it('exposes cancel fields for a cancelled order', () => {
    expect(serializeOblServiceOrder(cancelledOrder)).toEqual(
      expect.objectContaining({
        service_order_id: 'so-1',
        status: 'cancelled',
        cancelled_by: 'alice',
        cancelled_at: '2026-09-30T00:00:00.000Z',
      }),
    );
  });

  it('nulls cancel fields for an active order', () => {
    const active: OblServiceOrder = {
      ...cancelledOrder,
      status: 'active',
      cancelled_by: null,
      cancelled_at: null,
      cancelled_event_seq: null,
      cancelled_transaction_id: null,
    };
    expect(serializeOblServiceOrder(active)).toEqual(
      expect.objectContaining({
        status: 'active',
        cancelled_by: null,
        cancelled_at: null,
      }),
    );
  });
});
