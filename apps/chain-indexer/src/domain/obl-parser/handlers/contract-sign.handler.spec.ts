import type { OdlEventContext } from '../../odl-shared';
import type { OblRepository } from '../../../repositories/obl.repository';
import { ContractSignHandler } from './contract-sign.handler';
import { OblOffer } from '@opden-data-layer/odl-db-types';
import { mockOblNotifications } from '../obl-notification.service.spec-helpers';

const baseOffer: OblOffer = {
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
  arbiter: null,
  status: 'active',
  created_event_seq: BigInt(1),
  transaction_id: 'tx-offer',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
};

function ctx(creator: string): OdlEventContext {
  return {
    action: 'contract_sign',
    creator,
    blockNum: 1,
    transactionIndex: 0,
    operationIndex: 0,
    odlEventIndex: 0,
    transactionId: 'tx-sign',
    timestamp: '2026-01-01T00:00:00.000Z',
    eventSeq: BigInt(100),
    eventIdIndexMap: new Map(),
  };
}

describe('ContractSignHandler', () => {
  let handler: ContractSignHandler;
  let findOfferVersion: jest.Mock;
  let findContract: jest.Mock;
  let findContractForOfferAndPair: jest.Mock;
  let hasLedgerForPair: jest.Mock;
  let runInTransaction: jest.Mock;
  let insertContract: jest.Mock;
  let promotePendingLinesForPair: jest.Mock;
  let oblNotifications: ReturnType<typeof mockOblNotifications>;

  beforeEach(() => {
    findOfferVersion = jest.fn();
    findContract = jest.fn().mockResolvedValue(null);
    findContractForOfferAndPair = jest.fn().mockResolvedValue(null);
    hasLedgerForPair = jest.fn().mockResolvedValue(false);
    runInTransaction = jest.fn(async (fn: (trx: unknown) => Promise<void>) => fn({}));
    insertContract = jest.fn().mockResolvedValue(undefined);
    promotePendingLinesForPair = jest.fn();
    oblNotifications = mockOblNotifications();
    handler = new ContractSignHandler({
      findOfferVersion,
      findContract,
      findContractForOfferAndPair,
      hasLedgerForPair,
      runInTransaction,
      insertContract,
      insertLedger: jest.fn(),
      promotePendingLinesForPair,
    } as unknown as OblRepository, oblNotifications.service);
  });

  it('rejects when provider does not match offer author', async () => {
    findOfferVersion.mockResolvedValue(baseOffer);
    await handler.handle(
      {
        contract_id: 'c-1',
        offer_id: 'offer-1',
        offer_version: 1,
        provider: 'wrong',
        client: 'bob',
        signer: 'bob',
      },
      ctx('bob'),
    );
    expect(insertContract).not.toHaveBeenCalled();
  });

  it('creates contract when provider matches offer author', async () => {
    findOfferVersion.mockResolvedValue(baseOffer);
    await handler.handle(
      {
        contract_id: 'c-1',
        offer_id: 'offer-1',
        offer_version: 1,
        provider: 'alice',
        client: 'bob',
        signer: 'bob',
      },
      ctx('bob'),
    );
    expect(runInTransaction).toHaveBeenCalled();
    expect(insertContract).toHaveBeenCalled();
    expect(oblNotifications.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: 'obl_contract_sign',
        actor: 'bob',
        payload: expect.objectContaining({
          contractId: 'c-1',
          provider: 'alice',
          client: 'bob',
          signer: 'bob',
        }),
      }),
    );
  });

  it('rejects duplicate contract for same offer and pair', async () => {
    findOfferVersion.mockResolvedValue(baseOffer);
    findContractForOfferAndPair.mockResolvedValue({
      contract_id: 'existing',
      offer_id: 'offer-1',
    });
    await handler.handle(
      {
        contract_id: 'c-2',
        offer_id: 'offer-1',
        offer_version: 1,
        provider: 'alice',
        client: 'bob',
        signer: 'bob',
      },
      ctx('bob'),
    );
    expect(insertContract).not.toHaveBeenCalled();
    expect(oblNotifications.emit).not.toHaveBeenCalled();
  });

  it('stores metadata on contract insert', async () => {
    findOfferVersion.mockResolvedValue(baseOffer);
    await handler.handle(
      {
        contract_id: 'c-1',
        offer_id: 'offer-1',
        offer_version: 1,
        provider: 'alice',
        client: 'bob',
        signer: 'bob',
        metadata: { targets: ['obj-1'], governance: 'gov-1' },
      },
      ctx('bob'),
    );
    expect(insertContract).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { targets: ['obj-1'], governance: 'gov-1' },
      }),
      expect.anything(),
    );
  });

  it('copies service order schema from offer terms', async () => {
    const schema = {
      type: 'object',
      properties: { id: { type: 'string' } },
    };
    findOfferVersion.mockResolvedValue({
      ...baseOffer,
      terms: { serviceOrderSchema: schema },
    });
    await handler.handle(
      {
        contract_id: 'c-1',
        offer_id: 'offer-1',
        offer_version: 1,
        provider: 'alice',
        client: 'bob',
        signer: 'bob',
      },
      ctx('bob'),
    );
    expect(insertContract).toHaveBeenCalledWith(
      expect.objectContaining({
        service_order_schema: schema,
      }),
      expect.anything(),
    );
  });

  it('stores null service_order_schema when offer schema sanitizes to empty', async () => {
    findOfferVersion.mockResolvedValue({
      ...baseOffer,
      terms: {
        serviceOrderSchema: {
          type: 'object',
          properties: { __proto__: { type: 'string' } },
        },
      },
    });
    await handler.handle(
      {
        contract_id: 'c-1',
        offer_id: 'offer-1',
        offer_version: 1,
        provider: 'alice',
        client: 'bob',
        signer: 'bob',
      },
      ctx('bob'),
    );
    expect(insertContract).toHaveBeenCalledWith(
      expect.objectContaining({
        service_order_schema: null,
      }),
      expect.anything(),
    );
  });

  it('promotes pending lines when ledger did not exist', async () => {
    findOfferVersion.mockResolvedValue(baseOffer);
    hasLedgerForPair.mockResolvedValue(false);
    await handler.handle(
      {
        contract_id: 'c-1',
        offer_id: 'offer-1',
        offer_version: 1,
        provider: 'alice',
        client: 'bob',
        signer: 'bob',
      },
      ctx('bob'),
    );
    expect(promotePendingLinesForPair).toHaveBeenCalledWith(
      'alice',
      'bob',
      expect.anything(),
    );
  });

  it('skips promote when ledger already existed', async () => {
    findOfferVersion.mockResolvedValue(baseOffer);
    hasLedgerForPair.mockResolvedValue(true);
    await handler.handle(
      {
        contract_id: 'c-1',
        offer_id: 'offer-1',
        offer_version: 1,
        provider: 'alice',
        client: 'bob',
        signer: 'bob',
      },
      ctx('bob'),
    );
    expect(promotePendingLinesForPair).not.toHaveBeenCalled();
  });
});
