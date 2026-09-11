import type { OdlEventContext } from '../../odl-shared';
import type { OblRepository } from '../../../repositories/obl.repository';
import { ReportCreateHandler } from './report-create.handler';
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
    action: 'report_create',
    creator,
    blockNum: 1,
    transactionIndex: 0,
    operationIndex: 0,
    odlEventIndex: 0,
    transactionId: 'tx-rep',
    timestamp: '2026-01-01T00:00:00.000Z',
    eventSeq: BigInt(100),
    eventIdIndexMap: new Map(),
  };
}

describe('ReportCreateHandler', () => {
  let handler: ReportCreateHandler;
  let findReport: jest.Mock;
  let findServiceOrder: jest.Mock;
  let findContract: jest.Mock;
  let insertReport: jest.Mock;
  let oblNotifications: ReturnType<typeof mockOblNotifications>;

  beforeEach(() => {
    findReport = jest.fn().mockResolvedValue(null);
    findServiceOrder = jest.fn().mockResolvedValue({
      service_order_id: 'so-1',
      contract_id: 'c-1',
    });
    findContract = jest.fn().mockResolvedValue(contract);
    insertReport = jest.fn().mockResolvedValue(undefined);
    oblNotifications = mockOblNotifications();
    handler = new ReportCreateHandler(
      {
        findReport,
        findServiceOrder,
        findContract,
        insertReport,
      } as unknown as OblRepository,
      oblNotifications.service,
    );
  });

  it('resolves contract from service order when only service_order_id given', async () => {
    await handler.handle(
      {
        report_id: 'r-1',
        author: 'bob',
        service_order_id: 'so-1',
      },
      ctx('bob'),
    );
    expect(insertReport).toHaveBeenCalledWith(
      expect.objectContaining({
        report_id: 'r-1',
        contract_id: 'c-1',
        service_order_id: 'so-1',
        author: 'bob',
      }),
    );
    expect(oblNotifications.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'obl_report_create', actor: 'bob' }),
    );
  });

  it('rejects inconsistent contract_id and service_order_id', async () => {
    await handler.handle(
      {
        report_id: 'r-1',
        author: 'alice',
        contract_id: 'c-other',
        service_order_id: 'so-1',
      },
      ctx('alice'),
    );
    expect(insertReport).not.toHaveBeenCalled();
    expect(oblNotifications.emit).not.toHaveBeenCalled();
  });

  it('rejects author who is not a contract party', async () => {
    await handler.handle(
      {
        report_id: 'r-1',
        author: 'carol',
        contract_id: 'c-1',
      },
      ctx('carol'),
    );
    expect(insertReport).not.toHaveBeenCalled();
    expect(oblNotifications.emit).not.toHaveBeenCalled();
  });

  it('skips when report already exists', async () => {
    findReport.mockResolvedValue({ report_id: 'r-1' });
    await handler.handle(
      {
        report_id: 'r-1',
        author: 'alice',
        contract_id: 'c-1',
      },
      ctx('alice'),
    );
    expect(insertReport).not.toHaveBeenCalled();
    expect(oblNotifications.emit).not.toHaveBeenCalled();
  });

  it('skips when service order not found', async () => {
    findServiceOrder.mockResolvedValue(null);
    await handler.handle(
      {
        report_id: 'r-1',
        author: 'alice',
        service_order_id: 'so-missing',
      },
      ctx('alice'),
    );
    expect(insertReport).not.toHaveBeenCalled();
    expect(oblNotifications.emit).not.toHaveBeenCalled();
  });
});
