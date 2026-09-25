import {
  getHiveDelegateRcMaxAmount,
  getWalletDelegateBalanceConfig,
  getWalletPowerBalanceConfig,
  getWalletTransferBalanceConfig,
  listWalletManageDelegationsAssetOptions,
  listWalletPowerAssetOptions,
  listWalletTransferAssetOptions,
} from './wallet-modal-balances';
import type { EngineWalletSummaryView } from './types/engine-wallet-view';
import type { HiveWalletSummaryView } from './types/hive-wallet-view';
import type { WaivWalletSummaryView } from './types/waiv-wallet-view';

const rowDefaults = {
  unstakingCooldown: 0,
  numberTransactions: 0,
};

describe('wallet-modal-balances engine tokens', () => {
  const engineSummary: EngineWalletSummaryView = {
    account: 'alice',
    pinnedTokens: [
      {
        symbol: 'SWAP.HIVE',
        name: 'SWAP.HIVE',
        iconUrl: null,
        balance: '10',
        stake: '2',
        stakingEnabled: true,
        precision: 3,
        usdEstimate: 1,
        isPinned: true,
        ...rowDefaults,
      },
    ],
    tokens: [
      {
        symbol: 'BEE',
        name: 'BEE',
        iconUrl: null,
        balance: '5',
        stake: '1',
        stakingEnabled: true,
        precision: 3,
        usdEstimate: 0.1,
        isPinned: false,
        ...rowDefaults,
      },
    ],
    powerEligibleTokens: [
      {
        symbol: 'DUST',
        name: 'Dust',
        iconUrl: null,
        balance: '0.0001',
        stake: '0',
        stakingEnabled: true,
        precision: 3,
        usdEstimate: 0,
        isPinned: false,
        unstakingCooldown: 7,
        numberTransactions: 1,
      },
      {
        symbol: 'BEE',
        name: 'BEE',
        iconUrl: null,
        balance: '5',
        stake: '1',
        stakingEnabled: true,
        precision: 3,
        usdEstimate: 0.1,
        isPinned: false,
        ...rowDefaults,
      },
    ],
    estimatedAccountValueUsd: 2,
    rates: { hiveUsd: 0.3 },
  };

  it('lists engine tokens for transfer options', () => {
    const options = listWalletTransferAssetOptions('none', null, null, engineSummary);
    expect(options).toContain('SWAP.HIVE');
    expect(options).toContain('BEE');
  });

  it('resolves max liquid balance for arbitrary engine symbol', () => {
    const config = getWalletTransferBalanceConfig(
      'BEE',
      'none',
      null,
      null,
      engineSummary,
    );
    expect(config?.maxAmount).toBe('5');
    expect(config?.validation).toBe('engine');
  });

  it('lists dust stakeable tokens for power up from powerEligibleTokens', () => {
    const options = listWalletPowerAssetOptions('up', null, null, engineSummary);
    expect(options).toContain('DUST');
    expect(options).toContain('BEE');
  });

  it('lists staked tokens for power down', () => {
    const options = listWalletPowerAssetOptions('down', null, null, engineSummary);
    expect(options).not.toContain('DUST');
    expect(options).toContain('BEE');
  });

  it('lists WAIV then HIVE before engine tokens when eligible', () => {
    const waiv = {
      balance: { liquid: '1', stake: '2' },
      rates: { waivUsd: 1 },
    } as Parameters<typeof listWalletPowerAssetOptions>[1];
    const hive = {
      balance: { liquidHive: '3', hivePower: '4' },
      rates: { hiveUsd: 1 },
    } as Parameters<typeof listWalletPowerAssetOptions>[2];
    const options = listWalletPowerAssetOptions('up', waiv, hive, engineSummary);
    expect(options.slice(0, 2)).toEqual(['WAIV', 'HIVE']);
    expect(options).toContain('BEE');
  });
});

describe('getWalletDelegateBalanceConfig', () => {
  const waiv = {
    balance: { liquid: '100', stake: '18600' },
    rates: { waivUsd: 0.05 },
  } as WaivWalletSummaryView;

  const hive = {
    balance: { hivePower: '500' },
    rates: { hiveUsd: 0.25 },
  } as HiveWalletSummaryView;

  it('returns WP symbol, USD rate, and 7-day return for WAIV', () => {
    const config = getWalletDelegateBalanceConfig('WAIV', waiv, null);
    expect(config).toMatchObject({
      maxAmount: '18600',
      balanceSymbol: 'WP',
      validation: 'engine',
      tokenUsdRate: 0.05,
      returnDays: 7,
    });
  });

  it('returns HP symbol, USD rate, and 5-day return for HIVE', () => {
    const config = getWalletDelegateBalanceConfig('HIVE', null, {
      ...hive,
      balance: { ...hive.balance, hivePower: '23.23907190900226' },
    });
    expect(config).toMatchObject({
      maxAmount: '23.239',
      balanceSymbol: 'HP',
      validation: 'hive',
      tokenUsdRate: 0.25,
      returnDays: 5,
    });
  });

  it('TC-003 uses delegatable HP instead of full hive power', () => {
    const config = getWalletDelegateBalanceConfig('HIVE', null, {
      balance: { hivePower: '210.368', delegatableHp: '158.334' },
      rates: { hiveUsd: 0.25 },
    } as HiveWalletSummaryView);
    expect(config?.maxAmount).toBe('158.334');
  });

  it('TC-017 falls back to hive power when delegatable HP is absent', () => {
    const config = getWalletDelegateBalanceConfig('HIVE', null, {
      balance: { hivePower: '210.368' },
      rates: { hiveUsd: 0.25 },
    } as HiveWalletSummaryView);
    expect(config?.maxAmount).toBe('210.368');
  });
});

describe('getWalletPowerBalanceConfig', () => {
  it('TC-006 keeps power-down max on full hive power', () => {
    const config = getWalletPowerBalanceConfig(
      'HIVE',
      'down',
      null,
      {
        balance: { hivePower: '210.368', delegatableHp: '158.334' },
      } as HiveWalletSummaryView,
    );
    expect(config?.maxAmount).toBe('210.368');
  });
});

describe('getHiveDelegateRcMaxAmount', () => {
  function rcHive(rc: {
    maxCapacity: string;
    delegatedRc: string;
    receivedDelegatedRc: string;
    currentMana: string;
  }): HiveWalletSummaryView {
    return {
      rc: { totalOwned: rc.maxCapacity, ...rc },
    } as HiveWalletSummaryView;
  }

  it('TC-007 does not subtract outgoing RC again and keeps the 3b reserve', () => {
    expect(
      getHiveDelegateRcMaxAmount(
        rcHive({
          maxCapacity: '100000000000',
          delegatedRc: '20000000000',
          receivedDelegatedRc: '0',
          currentMana: '100000000000',
        }),
      ),
    ).toBe('97000000000');
  });

  it('TC-008 excludes received RC', () => {
    expect(
      getHiveDelegateRcMaxAmount(
        rcHive({
          maxCapacity: '100000000000',
          delegatedRc: '0',
          receivedDelegatedRc: '30000000000',
          currentMana: '100000000000',
        }),
      ),
    ).toBe('67000000000');
  });

  it('TC-009 caps available RC by current mana', () => {
    expect(
      getHiveDelegateRcMaxAmount(
        rcHive({
          maxCapacity: '100000000000',
          delegatedRc: '20000000000',
          receivedDelegatedRc: '0',
          currentMana: '10000000000',
        }),
      ),
    ).toBe('7000000000');
  });

  it('TC-010 returns zero when current mana is zero', () => {
    expect(
      getHiveDelegateRcMaxAmount(
        rcHive({
          maxCapacity: '100000000000',
          delegatedRc: '0',
          receivedDelegatedRc: '0',
          currentMana: '0',
        }),
      ),
    ).toBe('0');
  });

  it('TC-018 returns zero when own RC is below the reserve', () => {
    expect(
      getHiveDelegateRcMaxAmount(
        rcHive({
          maxCapacity: '2000000000',
          delegatedRc: '0',
          receivedDelegatedRc: '0',
          currentMana: '2000000000',
        }),
      ),
    ).toBe('0');
  });

  it('TC-019 returns zero when received RC exceeds max capacity', () => {
    expect(
      getHiveDelegateRcMaxAmount(
        rcHive({
          maxCapacity: '1000000000',
          delegatedRc: '0',
          receivedDelegatedRc: '5000000000',
          currentMana: '1000000000',
        }),
      ),
    ).toBe('0');
  });
});

describe('listWalletManageDelegationsAssetOptions', () => {
  it('lists only WAIV and HIVE when both summaries exist', () => {
    const waiv = {
      balance: { liquid: '1', stake: '2' },
      rates: { waivUsd: 1 },
    } as WaivWalletSummaryView;
    const hive = {
      balance: { hivePower: '3' },
      rates: { hiveUsd: 1 },
    } as HiveWalletSummaryView;
    expect(listWalletManageDelegationsAssetOptions(waiv, hive)).toEqual([
      'WAIV',
      'HIVE',
    ]);
  });

  it('omits engine tokens from manage delegations selector', () => {
    const engineSummary = {
      pinnedTokens: [],
      tokens: [{ symbol: 'BEE', stake: '1', balance: '1', stakingEnabled: true }],
    } as EngineWalletSummaryView;
    const waiv = {
      balance: { liquid: '1', stake: '2' },
      rates: { waivUsd: 1 },
    } as WaivWalletSummaryView;
    expect(
      listWalletManageDelegationsAssetOptions(waiv, null).length,
    ).toBe(1);
    expect(
      listWalletPowerAssetOptions('down', waiv, null, engineSummary),
    ).toContain('BEE');
  });
});
