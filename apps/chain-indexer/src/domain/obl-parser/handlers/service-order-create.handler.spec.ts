import type { OdlEventContext } from '../../odl-shared';
import type { OblRepository } from '../../../repositories/obl.repository';
import { ServiceOrderCreateHandler } from './service-order-create.handler';
import { OblContract } from '@opden-data-layer/odl-db-types';
import { mockOblNotifications } from '../obl-notification.service.spec-helpers';

const contract: OblContract = {
  contract_id: 'c-1',
  offer_id: 'offer-1',
  offer_version: 1,
  provider: 'alice',
  client: 'bob',
  dispute_rule: 'client',
  arbiter: null,
  metadata: {},
  service_order_schema: null,
  pair_low: 'alice',
  pair_high: 'bob',
  created_event_seq: BigInt(1),
  transaction_id: 'tx-contract',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
};

function ctx(creator: string): OdlEventContext {
  return {
    action: 'service_order_create',
    creator,
    blockNum: 1,
    transactionIndex: 0,
    operationIndex: 0,
    odlEventIndex: 0,
    transactionId: 'tx-so',
    timestamp: '2026-01-01T00:00:00.000Z',
    eventSeq: BigInt(100),
    eventIdIndexMap: new Map(),
  };
}

describe('ServiceOrderCreateHandler', () => {
  let handler: ServiceOrderCreateHandler;
  let findServiceOrder: jest.Mock;
  let findContract: jest.Mock;
  let insertServiceOrder: jest.Mock;
  let oblNotifications: ReturnType<typeof mockOblNotifications>;

  beforeEach(() => {
    findServiceOrder = jest.fn().mockResolvedValue(null);
    findContract = jest.fn().mockResolvedValue(contract);
    insertServiceOrder = jest.fn().mockResolvedValue(undefined);
    oblNotifications = mockOblNotifications();
    handler = new ServiceOrderCreateHandler(
      {
        findServiceOrder,
        findContract,
        insertServiceOrder,
      } as unknown as OblRepository,
      oblNotifications.service,
    );
  });

  it('inserts service order when creator is a contract party', async () => {
    await handler.handle(
      {
        service_order_id: 'so-1',
        contract_id: 'c-1',
        creator: 'alice',
        details: { note: 'scope' },
      },
      ctx('alice'),
    );
    expect(insertServiceOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        service_order_id: 'so-1',
        contract_id: 'c-1',
        creator: 'alice',
        provider: 'alice',
        client: 'bob',
      }),
    );
    expect(oblNotifications.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'obl_service_order_create', actor: 'alice' }),
    );
  });

  it('rejects creator mismatch with ctx', async () => {
    await handler.handle(
      {
        service_order_id: 'so-1',
        contract_id: 'c-1',
        creator: 'alice',
      },
      ctx('bob'),
    );
    expect(insertServiceOrder).not.toHaveBeenCalled();
    expect(oblNotifications.emit).not.toHaveBeenCalled();
  });

  it('rejects creator who is not a contract party', async () => {
    await handler.handle(
      {
        service_order_id: 'so-1',
        contract_id: 'c-1',
        creator: 'carol',
      },
      ctx('carol'),
    );
    expect(insertServiceOrder).not.toHaveBeenCalled();
    expect(oblNotifications.emit).not.toHaveBeenCalled();
  });

  it('skips when service order already exists', async () => {
    findServiceOrder.mockResolvedValue({ service_order_id: 'so-1' });
    await handler.handle(
      {
        service_order_id: 'so-1',
        contract_id: 'c-1',
        creator: 'bob',
      },
      ctx('bob'),
    );
    expect(insertServiceOrder).not.toHaveBeenCalled();
    expect(oblNotifications.emit).not.toHaveBeenCalled();
  });

  it('skips when contract not found', async () => {
    findContract.mockResolvedValue(null);
    await handler.handle(
      {
        service_order_id: 'so-1',
        contract_id: 'missing',
        creator: 'alice',
      },
      ctx('alice'),
    );
    expect(insertServiceOrder).not.toHaveBeenCalled();
    expect(oblNotifications.emit).not.toHaveBeenCalled();
  });
});
