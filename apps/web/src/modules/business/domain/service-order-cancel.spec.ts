import {
  canCancelServiceOrder,
  isCancelledServiceOrderId,
  serviceOrderStatus,
} from './service-order-cancel';

describe('serviceOrderStatus', () => {
  it('treats missing status as active', () => {
    expect(serviceOrderStatus({})).toBe('active');
  });
});

describe('canCancelServiceOrder', () => {
  const so = { provider: 'alice', client: 'bob', status: 'active' as const };

  it('allows a party on an active order', () => {
    expect(canCancelServiceOrder(so, 'alice')).toBe(true);
    expect(canCancelServiceOrder(so, 'bob')).toBe(true);
  });

  it('rejects a non-party', () => {
    expect(canCancelServiceOrder(so, 'carol')).toBe(false);
  });

  it('rejects a cancelled order', () => {
    expect(canCancelServiceOrder({ ...so, status: 'cancelled' }, 'alice')).toBe(false);
  });
});

describe('isCancelledServiceOrderId', () => {
  const orders = [
    { service_order_id: 'so-1', status: 'cancelled' },
    { service_order_id: 'so-2', status: 'active' },
  ];

  it('matches a loaded cancelled id', () => {
    expect(isCancelledServiceOrderId('so-1', orders)).toBe(true);
    expect(isCancelledServiceOrderId(' so-1 ', orders)).toBe(true);
  });

  it('allows omitted and active ids', () => {
    expect(isCancelledServiceOrderId('', orders)).toBe(false);
    expect(isCancelledServiceOrderId('so-2', orders)).toBe(false);
    expect(isCancelledServiceOrderId('so-unknown', orders)).toBe(false);
  });
});
