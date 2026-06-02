import { EventEmitter2 } from '@nestjs/event-emitter';
import type { HiveEngineBlock, HiveEngineTransaction } from '@opden-data-layer/clients';
import {
  USER_OBJECT_POWERS_UPDATE_EVENT,
  UserObjectPowersUpdateEvent,
} from '../../user-object-powers/user-object-powers.events';
import { WaivStakeParser } from './waiv-stake.parser';

function tx(partial: Partial<HiveEngineTransaction> & Pick<HiveEngineTransaction, 'action' | 'payload'>): HiveEngineTransaction {
  return {
    refHiveBlockNumber: 1,
    transactionId: 'tx-id',
    sender: 'flowmaster',
    contract: 'tokens',
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

  it('emits +quantity for stake on payload.to', async () => {
    await parser.parseBlock({
      blockNumber: 1,
      transactions: [
        tx({
          action: 'stake',
          sender: 'flowmaster',
          payload: JSON.stringify({
            isSignedWithActiveKey: true,
            quantity: '2',
            symbol: 'WAIV',
            to: 'flowmaster',
          }),
        }),
      ],
    } as HiveEngineBlock);

    expect(emit).toHaveBeenCalledWith(
      USER_OBJECT_POWERS_UPDATE_EVENT,
      new UserObjectPowersUpdateEvent('flowmaster', 2),
    );
  });

  it('emits -quantity for unstake on payload.to', async () => {
    await parser.parseBlock({
      blockNumber: 1,
      transactions: [
        tx({
          action: 'unstake',
          sender: 'flowmaster',
          payload: JSON.stringify({
            isSignedWithActiveKey: true,
            quantity: '1',
            symbol: 'WAIV',
            to: 'flowmaster',
          }),
        }),
      ],
    } as HiveEngineBlock);

    expect(emit).toHaveBeenCalledWith(
      USER_OBJECT_POWERS_UPDATE_EVENT,
      new UserObjectPowersUpdateEvent('flowmaster', -1),
    );
  });

  it('emits +quantity for cancelUnstake from logs', async () => {
    await parser.parseBlock({
      blockNumber: 1,
      transactions: [
        tx({
          action: 'cancelUnstake',
          sender: 'flowmaster',
          payload: JSON.stringify({
            isSignedWithActiveKey: true,
            symbol: 'WAIV',
            txID: '8cbeff1998247d9d1e8a83cb538f52afbfb3e696',
          }),
          logs: JSON.stringify({
            events: [
              {
                contract: 'tokens',
                event: 'unstakeCancel',
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
      new UserObjectPowersUpdateEvent('flowmaster', 1),
    );
  });

  it('emits delegate deltas using sender and payload.to', async () => {
    await parser.parseBlock({
      blockNumber: 1,
      transactions: [
        tx({
          action: 'delegate',
          sender: 'flowmaster',
          payload: JSON.stringify({
            isSignedWithActiveKey: true,
            quantity: '0.1',
            symbol: 'WAIV',
            to: 'wiv01',
          }),
        }),
      ],
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

  it('ignores non-WAIV symbol', async () => {
    await parser.parseBlock({
      blockNumber: 1,
      transactions: [
        tx({
          action: 'stake',
          payload: JSON.stringify({
            quantity: '2',
            symbol: 'BEE',
            to: 'flowmaster',
          }),
        }),
      ],
    } as HiveEngineBlock);

    expect(emit).not.toHaveBeenCalled();
  });
});
