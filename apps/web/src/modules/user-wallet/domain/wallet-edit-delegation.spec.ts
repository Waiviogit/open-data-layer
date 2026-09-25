import {
  getWalletEditDelegationMaxAmount,
  hasHpDelegationEditChanged,
  parseHpEditDelegationAmount,
  resolveWaivDelegationEditOp,
  validateEditDelegationAmount,
} from './wallet-edit-delegation';
import type { EngineTokenDelegationsView } from './types/waiv-wallet-view';
import type { HiveHpDelegationsView } from './types/hive-wallet-view';
import type { WaivWalletSummaryView } from './types/waiv-wallet-view';
import type { HiveWalletSummaryView } from './types/hive-wallet-view';

describe('wallet-edit-delegation', () => {
  const waivData: EngineTokenDelegationsView = {
    account: 'alice',
    symbol: 'WAIV',
    incoming: [],
    outgoing: [
      { from: 'alice', to: 'bob', symbol: 'WAIV', quantity: '5000' },
      { from: 'alice', to: 'carol', symbol: 'WAIV', quantity: '3000' },
    ],
  };

  it('computes WAIV edit max as total power minus other outgoing', () => {
    const waivSummary = {
      balance: { stake: '92000', delegationsOut: '8000' },
    } as WaivWalletSummaryView;

    expect(
      getWalletEditDelegationMaxAmount(
        'WAIV',
        'bob',
        waivSummary,
        null,
        waivData,
        null,
      ),
    ).toBe('97000');
  });

  it('resolves WAIV delegate delta when increasing', () => {
    expect(resolveWaivDelegationEditOp('bob', '5000', '8000')).toEqual({
      action: 'delegate',
      to: 'bob',
      quantity: '3000',
    });
  });

  it('resolves WAIV undelegate delta when decreasing', () => {
    expect(resolveWaivDelegationEditOp('bob', '5000', '2000')).toEqual({
      action: 'undelegate',
      from: 'bob',
      quantity: '3000',
    });
  });

  it('resolves WAIV full undelegate when amount is zero', () => {
    expect(resolveWaivDelegationEditOp('bob', '5000', '0')).toEqual({
      action: 'undelegate',
      from: 'bob',
      quantity: '5000',
    });
  });

  it('returns null when WAIV amount is unchanged', () => {
    expect(resolveWaivDelegationEditOp('bob', '5000', '5000')).toBeNull();
  });

  it('validates edit amount including zero undelegate', () => {
    expect(validateEditDelegationAmount('0', '5000')).toBeNull();
    expect(validateEditDelegationAmount('6000', '5000')).toBe('amount_exceeds_max');
  });

  it('computes HIVE edit max as hive power minus other outgoing', () => {
    const hiveSummary = {
      balance: { hivePower: '100' },
    } as HiveWalletSummaryView;
    const hiveData: HiveHpDelegationsView = {
      account: 'alice',
      incoming: [],
      outgoing: [
        {
          delegator: 'alice',
          delegatee: 'bob',
          vestingShares: '1 VESTS',
          hp: '30',
          minDelegationTime: '',
        },
        {
          delegator: 'alice',
          delegatee: 'carol',
          vestingShares: '1 VESTS',
          hp: '20',
          minDelegationTime: '',
        },
      ],
    };
    expect(
      getWalletEditDelegationMaxAmount(
        'HIVE',
        'bob',
        null,
        hiveSummary,
        null,
        hiveData,
      ),
    ).toBe('80');
  });

  it('TC-004 adds only the edited HP row back onto delegatable HP', () => {
    const hiveSummary = {
      balance: { hivePower: '210.368', delegatableHp: '158.334' },
    } as HiveWalletSummaryView;
    const hiveData: HiveHpDelegationsView = {
      account: 'alice',
      incoming: [],
      outgoing: [
        {
          delegator: 'alice',
          delegatee: 'bob',
          vestingShares: '1 VESTS',
          hp: '50',
          minDelegationTime: '',
        },
        {
          delegator: 'alice',
          delegatee: 'carol',
          vestingShares: '1 VESTS',
          hp: '20',
          minDelegationTime: '',
        },
      ],
    };
    expect(
      getWalletEditDelegationMaxAmount(
        'HIVE',
        'bob',
        null,
        hiveSummary,
        null,
        hiveData,
      ),
    ).toBe('208.334');
  });

  it('uses only free HP when the recipient has no outgoing row', () => {
    const hiveSummary = {
      balance: { hivePower: '210.368', delegatableHp: '158.334' },
    } as HiveWalletSummaryView;
    const hiveData: HiveHpDelegationsView = {
      account: 'alice',
      incoming: [],
      outgoing: [
        {
          delegator: 'alice',
          delegatee: 'bob',
          vestingShares: '1 VESTS',
          hp: '50',
          minDelegationTime: '',
        },
      ],
    };
    expect(
      getWalletEditDelegationMaxAmount(
        'HIVE',
        'insta.agent',
        null,
        hiveSummary,
        null,
        hiveData,
      ),
    ).toBe('158.334');
  });

  it('detects unchanged HP edit amounts', () => {
    expect(hasHpDelegationEditChanged('30.000', '30')).toBe(false);
    expect(hasHpDelegationEditChanged('30', '29.999')).toBe(true);
    expect(hasHpDelegationEditChanged('5', '0')).toBe(true);
  });

  it('parses HP zero undelegate amounts', () => {
    expect(parseHpEditDelegationAmount('0.000')).toBe(0);
    expect(parseHpEditDelegationAmount('1.234')).toBe(1.234);
  });
});
