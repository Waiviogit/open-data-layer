import { hiveWalletApiResponseSchema } from './hive-wallet-api.schema';

describe('hiveWalletApiResponseSchema', () => {
  it('accepts legacy API payloads without new wallet fields', () => {
    const legacy = {
      account: 'alice',
      balance: {
        liquidHive: '3.297',
        hivePower: '82.40374429569705',
        delegationsNetHp: '0',
        rcMax: '135630143570',
        hiveSavings: '0',
        hbdLiquid: '0.02',
        hbdSavings: '0',
        hbdInterest: '0',
        toWithdrawHp: '0',
        vestingWithdrawRateHp: '0',
      },
      display: {
        liquidHive: '3.297',
        hivePower: '82.404',
        delegationsNetHp: '0',
        rcMax: '135.63b',
        hiveSavings: '0',
        hbdLiquid: '0.02',
        hbdSavings: '0',
        hbdInterest: '0',
        estAccountValueUsd: '4.22',
      },
      flags: {
        showDelegationsRow: false,
        showPowerDownRow: false,
        showInterestRow: false,
        showHiveSavingsPending: false,
        showHbdSavingsPending: false,
      },
      pendingSavingsWithdrawals: [],
      chain: {
        totalVestingShares: '341929171147.070619 VESTS',
        totalVestingFundSteem: '210885200.636 HIVE',
      },
      rates: { hiveUsd: 0.049, hbdUsd: 1 },
      pendingRewards: {
        hive: '0.000 HIVE',
        hbd: '0.000 HBD',
        vesting: '0.000000 VESTS',
        display: { hive: '0', hbd: '0', hp: '0' },
        hasRewards: false,
      },
    };

    const parsed = hiveWalletApiResponseSchema.safeParse(legacy);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.flags.showRcDelegationsRow).toBe(false);
      expect(parsed.data.balance.hivePower).toBe('82.40374429569705');
      expect(parsed.data.balance.delegatableHp).toBeUndefined();
    }
  });

  it('TC-015 parses a hive wallet payload that omits delegatableHp', () => {
    const legacy = {
      account: 'flowmaster',
      balance: {
        liquidHive: '0',
        hivePower: '210.368',
        delegationsNetHp: '-50',
        rcMax: '0',
        hiveSavings: '0',
        hbdLiquid: '0',
        hbdSavings: '0',
        hbdInterest: '0',
        toWithdrawHp: '0',
        vestingWithdrawRateHp: '0',
      },
      display: {
        liquidHive: '0',
        hivePower: '210.368',
        delegationsNetHp: '-50',
        rcMax: '0',
        hiveSavings: '0',
        hbdLiquid: '0',
        hbdSavings: '0',
        hbdInterest: '0',
        estAccountValueUsd: '0',
      },
      flags: {
        showDelegationsRow: true,
        showPowerDownRow: false,
        showInterestRow: false,
        showHiveSavingsPending: false,
        showHbdSavingsPending: false,
      },
      pendingSavingsWithdrawals: [],
      chain: {
        totalVestingShares: '1 VESTS',
        totalVestingFundSteem: '1 HIVE',
      },
      rates: { hiveUsd: 0, hbdUsd: 1 },
      pendingRewards: {
        hive: '0.000 HIVE',
        hbd: '0.000 HBD',
        vesting: '0.000000 VESTS',
        display: { hive: '0', hbd: '0', hp: '0' },
        hasRewards: false,
      },
    };

    const parsed = hiveWalletApiResponseSchema.safeParse(legacy);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.balance.hivePower).toBe('210.368');
      expect(parsed.data.balance.delegatableHp).toBeUndefined();
    }
  });

  it('TC-016 keeps delegatableHp when the payload includes it', () => {
    const legacy = {
      account: 'flowmaster',
      balance: {
        liquidHive: '0',
        hivePower: '210.368',
        delegatableHp: '158.334',
        delegationsNetHp: '-50',
        rcMax: '0',
        hiveSavings: '0',
        hbdLiquid: '0',
        hbdSavings: '0',
        hbdInterest: '0',
        toWithdrawHp: '0',
        vestingWithdrawRateHp: '0',
      },
      display: {
        liquidHive: '0',
        hivePower: '210.368',
        delegationsNetHp: '-50',
        rcMax: '0',
        hiveSavings: '0',
        hbdLiquid: '0',
        hbdSavings: '0',
        hbdInterest: '0',
        estAccountValueUsd: '0',
      },
      flags: {
        showDelegationsRow: true,
        showPowerDownRow: false,
        showInterestRow: false,
        showHiveSavingsPending: false,
        showHbdSavingsPending: false,
      },
      pendingSavingsWithdrawals: [],
      chain: {
        totalVestingShares: '1 VESTS',
        totalVestingFundSteem: '1 HIVE',
      },
      rates: { hiveUsd: 0, hbdUsd: 1 },
      pendingRewards: {
        hive: '0.000 HIVE',
        hbd: '0.000 HBD',
        vesting: '0.000000 VESTS',
        display: { hive: '0', hbd: '0', hp: '0' },
        hasRewards: false,
      },
    };

    const parsed = hiveWalletApiResponseSchema.safeParse(legacy);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.balance.delegatableHp).toBe('158.334');
    }
  });
});
