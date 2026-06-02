import { EventEmitter2 } from '@nestjs/event-emitter';
import type { HiveEngineBlock, HiveEngineTransaction } from '@opden-data-layer/clients';
import {
  USER_OBJECT_POWERS_UPDATE_EVENT,
  UserObjectPowersUpdateEvent,
} from '../../user-object-powers/user-object-powers.events';
import { WaivStakeParser } from './waiv-stake.parser';

function tx(
  partial: Partial<HiveEngineTransaction> & Pick<HiveEngineTransaction, 'action'>,
): HiveEngineTransaction {
  return {
    refHiveBlockNumber: 1,
    transactionId: 'tx-id',
    sender: 'flowmaster',
    contract: 'tokens',
    payload: '{}',
    executedCodeHash: '',
    hash: '',
    databaseHash: '',
    logs: '{}',
    ...partial,
  };
}

describe('WaivStakeParser', () => {
  let parser: WaivStakeParser;
  let emit: jest.Mock;

  beforeEach(() => {
    emit = jest.fn();
    parser = new WaivStakeParser({ emit } as unknown as EventEmitter2);
  });

  it('emits +quantity for stake from stake log event', async () => {
    await parser.parseBlock({
      blockNumber: 1,
      transactions: [
        tx({
          action: 'stake',
          sender: 'flowmaster',
          logs: JSON.stringify({
            events: [
              {
                contract: 'tokens',
                event: 'stake',
                data: {
                  account: 'flowmaster',
                  quantity: '2.00000000',
                  symbol: 'WAIV',
                },
              },
            ],
          }),
        }),
      ],
      virtualTransactions: [],
    } as HiveEngineBlock);

    expect(emit).toHaveBeenCalledWith(
      USER_OBJECT_POWERS_UPDATE_EVENT,
      new UserObjectPowersUpdateEvent('flowmaster', 2),
    );
  });

  it('does not emit when stake tx has no WAIV log events', async () => {
    await parser.parseBlock({
      blockNumber: 1,
      transactions: [tx({ action: 'stake', logs: JSON.stringify({ events: [] }) })],
      virtualTransactions: [],
    } as HiveEngineBlock);

    expect(emit).not.toHaveBeenCalled();
  });

  it('does not emit when stake tx has invalid logs', async () => {
    await parser.parseBlock({
      blockNumber: 1,
      transactions: [tx({ action: 'stake', logs: 'not-json' })],
      virtualTransactions: [],
    } as HiveEngineBlock);

    expect(emit).not.toHaveBeenCalled();
  });

  it('emits delegate deltas from delegate log event', async () => {
    await parser.parseBlock({
      blockNumber: 1,
      transactions: [
        tx({
          action: 'delegate',
          sender: 'flowmaster',
          logs: JSON.stringify({
            events: [
              {
                contract: 'tokens',
                event: 'delegate',
                data: {
                  to: 'wiv01',
                  quantity: '0.10000000',
                  symbol: 'WAIV',
                },
              },
            ],
          }),
        }),
      ],
      virtualTransactions: [],
    } as HiveEngineBlock);

    expect(emit).toHaveBeenCalledWith(
      USER_OBJECT_POWERS_UPDATE_EVENT,
      new UserObjectPowersUpdateEvent('flowmaster', -0.1),
    );
    expect(emit).toHaveBeenCalledWith(
      USER_OBJECT_POWERS_UPDATE_EVENT,
      new UserObjectPowersUpdateEvent('wiv01', 0.1),
    );
  });

  it('emits -quantity for undelegateStart on delegatee (data.from)', async () => {
    await parser.parseBlock({
      blockNumber: 1,
      transactions: [
        tx({
          action: 'undelegate',
          sender: 'flowmaster',
          logs: JSON.stringify({
            events: [
              {
                contract: 'tokens',
                event: 'undelegateStart',
                data: {
                  from: 'wiv01',
                  quantity: '0.50000000',
                  symbol: 'WAIV',
                },
              },
            ],
          }),
        }),
      ],
      virtualTransactions: [],
    } as HiveEngineBlock);

    expect(emit).toHaveBeenCalledWith(
      USER_OBJECT_POWERS_UPDATE_EVENT,
      new UserObjectPowersUpdateEvent('wiv01', -0.5),
    );
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it('emits -quantity for unstake from virtual checkPendingUnstakes tx', async () => {
    await parser.parseBlock({
      blockNumber: 1,
      transactions: [],
      virtualTransactions: [
        tx({
          action: 'checkPendingUnstakes',
          sender: 'null',
          logs: JSON.stringify({
            events: [
              {
                contract: 'tokens',
                event: 'unstake',
                data: {
                  account: 'flowmaster',
                  quantity: '1.00000000',
                  symbol: 'WAIV',
                },
              },
            ],
          }),
        }),
      ],
    } as HiveEngineBlock);

    expect(emit).toHaveBeenCalledWith(
      USER_OBJECT_POWERS_UPDATE_EVENT,
      new UserObjectPowersUpdateEvent('flowmaster', -1),
    );
  });

  it('emits multiple unstake deltas from one virtual tx', async () => {
    await parser.parseBlock({
      blockNumber: 1,
      transactions: [],
      virtualTransactions: [
        tx({
          action: 'checkPendingUnstakes',
          sender: 'null',
          logs: JSON.stringify({
            events: [
              {
                contract: 'tokens',
                event: 'unstake',
                data: {
                  account: 'alice',
                  quantity: '2.00000000',
                  symbol: 'WAIV',
                },
              },
              {
                contract: 'tokens',
                event: 'unstake',
                data: {
                  account: 'bob',
                  quantity: '3.00000000',
                  symbol: 'WAIV',
                },
              },
            ],
          }),
        }),
      ],
    } as HiveEngineBlock);

    expect(emit).toHaveBeenCalledWith(
      USER_OBJECT_POWERS_UPDATE_EVENT,
      new UserObjectPowersUpdateEvent('alice', -2),
    );
    expect(emit).toHaveBeenCalledWith(
      USER_OBJECT_POWERS_UPDATE_EVENT,
      new UserObjectPowersUpdateEvent('bob', -3),
    );
  });

  it('emits +quantity for undelegateDone from virtual checkPendingUndelegations tx', async () => {
    await parser.parseBlock({
      blockNumber: 1,
      transactions: [],
      virtualTransactions: [
        tx({
          action: 'checkPendingUndelegations',
          sender: 'null',
          logs: JSON.stringify({
            events: [
              {
                contract: 'tokens',
                event: 'undelegateDone',
                data: {
                  account: 'flowmaster',
                  quantity: '0.50000000',
                  symbol: 'WAIV',
                },
              },
            ],
          }),
        }),
      ],
    } as HiveEngineBlock);

    expect(emit).toHaveBeenCalledWith(
      USER_OBJECT_POWERS_UPDATE_EVENT,
      new UserObjectPowersUpdateEvent('flowmaster', 0.5),
    );
  });

  it('ignores non-WAIV log events', async () => {
    await parser.parseBlock({
      blockNumber: 1,
      transactions: [
        tx({
          action: 'stake',
          logs: JSON.stringify({
            events: [
              {
                contract: 'tokens',
                event: 'stake',
                data: {
                  account: 'flowmaster',
                  quantity: '2.00000000',
                  symbol: 'BEE',
                },
              },
            ],
          }),
        }),
      ],
      virtualTransactions: [],
    } as HiveEngineBlock);

    expect(emit).not.toHaveBeenCalled();
  });

  it('ignores user unstake action without unstake log event', async () => {
    await parser.parseBlock({
      blockNumber: 1,
      transactions: [
        tx({
          action: 'unstake',
          logs: JSON.stringify({
            events: [
              {
                contract: 'tokens',
                event: 'unstakeStart',
                data: {
                  account: 'flowmaster',
                  quantity: '1.00000000',
                  symbol: 'WAIV',
                },
              },
            ],
          }),
        }),
      ],
      virtualTransactions: [],
    } as HiveEngineBlock);

    expect(emit).not.toHaveBeenCalled();
  });
});
