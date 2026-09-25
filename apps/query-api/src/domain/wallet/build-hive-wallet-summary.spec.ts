import {
  buildHiveWalletSummary,
  calculateHivePowerDownWeeksRemainingFromVests,
  canClaimHbdInterest,
  emptyHiveBalance,
  estimateHbdInterestBalance,
  mapHiveAccountToBalanceFields,
  mapPendingRewards,
  mapRcAccountToSnapshot,
} from './build-hive-wallet-summary';

const PENDING_REWARDS_CHAIN = {
  totalVestingShares: '1000.000000 VESTS',
  totalVestingFundSteem: '1.000 HIVE',
};

const EMPTY_PENDING_REWARDS = mapPendingRewards({}, PENDING_REWARDS_CHAIN);

const CHAIN = {
  totalVestingShares: '1000000000 VESTS',
  totalVestingFundSteem: '500000000 HIVE',
  hbdInterestRatePercent: 20,
};

describe('estimateHbdInterestBalance', () => {
  it('returns 0 when balance is zero', () => {
    expect(
      estimateHbdInterestBalance({
        savingsHbdBalance: '0 HBD',
        savingsHbdSeconds: '0',
        savingsHbdSecondsLastUpdate: '2024-01-01T00:00:00',
        interestRatePercent: 20,
        nowMs: Date.parse('2024-06-01T00:00:00'),
      }),
    ).toBe(0);
  });

  it('accrues interest from savings_hbd_seconds accumulator', () => {
    const interest = estimateHbdInterestBalance({
      savingsHbdBalance: '100 HBD',
      savingsHbdSeconds: '1000000000',
      savingsHbdSecondsLastUpdate: '2024-01-01T00:00:00',
      interestRatePercent: 20,
      nowMs: Date.parse('2024-01-02T00:00:00'),
    });
    expect(interest).toBeGreaterThan(0);
  });
});

describe('canClaimHbdInterest', () => {
  it('allows claim on epoch payment date', () => {
    expect(canClaimHbdInterest('1970-01-01T00:00:00')).toBe(true);
  });

  it('blocks claim within 30 days', () => {
    const now = Date.parse('2024-02-15T00:00:00');
    expect(canClaimHbdInterest('2024-02-01T00:00:00', now)).toBe(false);
  });
});

describe('buildHiveWalletSummary', () => {
  it('formats display fields and flags', () => {
    const balance = mapHiveAccountToBalanceFields(
      {
        balance: '22.645 HIVE',
        hbd_balance: '0.014 HBD',
        vesting_shares: '400000000 VESTS',
        delegated_vesting_shares: '100000000 VESTS',
        received_vesting_shares: '250000000 VESTS',
        savings_balance: '0 HIVE',
        savings_hbd_balance: '0.836 HBD',
        savings_hbd_seconds: '1000000',
        savings_hbd_seconds_last_update: '2024-01-01T00:00:00',
        savings_hbd_last_interest_payment: '1970-01-01T00:00:00',
        to_withdraw: '0 VESTS',
        vesting_withdraw_rate: '0 VESTS',
      },
      CHAIN,
      '432210000000',
    );

    const summary = buildHiveWalletSummary(
      balance,
      { hiveUsd: 0.25, hbdUsd: 1 },
      {
        canClaimInterest: true,
        daysUntilInterestClaim: 0,
        nextVestingWithdrawal: null,
        pendingSavingsWithdrawals: [],
        pendingRewards: EMPTY_PENDING_REWARDS,
      },
    );

    expect(summary.display.liquidHive).toBe('22.645');
    expect(summary.display.hivePower).toBeTruthy();
    expect(summary.display.delegationsNetHp).toMatch(/^\+/);
    expect(summary.display.rcMax).toBe('432.21b');
    expect(summary.flags.showDelegationsRow).toBe(true);
    expect(summary.flags.showPowerDownRow).toBe(false);
    expect(Number.parseFloat(summary.display.estAccountValueUsd)).toBeGreaterThan(0);
  });

  it('shows power down row when to_withdraw is non-zero', () => {
    const account = {
      balance: '1 HIVE',
      vesting_shares: '1000000 VESTS',
      to_withdraw: '500000 VESTS',
      vesting_withdraw_rate: '100000 VESTS',
      next_vesting_withdrawal: '2026-06-26T15:10:00',
    };
    const balance = mapHiveAccountToBalanceFields(account, CHAIN, '1000');

    const summary = buildHiveWalletSummary(
      balance,
      { hiveUsd: 1, hbdUsd: 1 },
      {
        canClaimInterest: false,
        daysUntilInterestClaim: 12,
        nextVestingWithdrawal: '2026-06-26T15:10:00',
        pendingSavingsWithdrawals: [],
        pendingRewards: EMPTY_PENDING_REWARDS,
        toWithdrawVests: account.to_withdraw,
        vestingWithdrawRateVests: account.vesting_withdraw_rate,
      },
    );

    expect(summary.flags.showPowerDownRow).toBe(true);
    expect(summary.powerDown?.nextVestingWithdrawal).toBe('2026-06-26T15:10:00');
    expect(summary.powerDown?.weeksRemaining).toBe(5);
  });

  it('computes power down weeks from VESTS ratio and sensible HP display values', () => {
    const account = {
      balance: '1 HIVE',
      vesting_shares: '1000000 VESTS',
      to_withdraw: '1300000 VESTS',
      vesting_withdraw_rate: '100000 VESTS',
      next_vesting_withdrawal: '2026-08-04T09:03:00',
    };
    const balance = mapHiveAccountToBalanceFields(account, CHAIN, '1000');

    const summary = buildHiveWalletSummary(
      balance,
      { hiveUsd: 1, hbdUsd: 1 },
      {
        canClaimInterest: false,
        daysUntilInterestClaim: 0,
        nextVestingWithdrawal: account.next_vesting_withdrawal,
        pendingSavingsWithdrawals: [],
        pendingRewards: EMPTY_PENDING_REWARDS,
        toWithdrawVests: account.to_withdraw,
        vestingWithdrawRateVests: account.vesting_withdraw_rate,
      },
    );

    expect(calculateHivePowerDownWeeksRemainingFromVests(
      account.to_withdraw,
      account.vesting_withdraw_rate,
    )).toBe(13);
    expect(summary.powerDown?.weeksRemaining).toBe(13);
    expect(summary.powerDown?.weeksTotal).toBe(13);
    expect(summary.powerDown?.toWithdrawHp).toBe('650,000');
    expect(summary.powerDown?.vestingWithdrawRateHp).toBe('50,000');
  });

  it('subtracts withdrawn VESTS so weeks remaining tracks completed installments', () => {
    const chain = {
      totalVestingShares: '346148705781.795308 VESTS',
      totalVestingFundSteem: '214342273.141 HIVE',
      hbdInterestRatePercent: 20,
    };
    const account = {
      balance: '1 HIVE',
      vesting_shares: '1000000 VESTS',
      to_withdraw: 3071869229505,
      withdrawn: 1181488165195,
      vesting_withdraw_rate: '236297.633039 VESTS',
      next_vesting_withdrawal: '2026-09-08T12:03:33',
    };
    const balance = mapHiveAccountToBalanceFields(account, chain, '1000');

    const summary = buildHiveWalletSummary(
      balance,
      { hiveUsd: 1, hbdUsd: 1 },
      {
        canClaimInterest: false,
        daysUntilInterestClaim: 0,
        nextVestingWithdrawal: account.next_vesting_withdrawal,
        pendingSavingsWithdrawals: [],
        pendingRewards: EMPTY_PENDING_REWARDS,
        toWithdrawVests: account.to_withdraw,
        withdrawnVests: account.withdrawn,
        vestingWithdrawRateVests: account.vesting_withdraw_rate,
      },
    );

    expect(
      calculateHivePowerDownWeeksRemainingFromVests(
        account.to_withdraw,
        account.vesting_withdraw_rate,
        account.withdrawn,
      ),
    ).toBe(8);
    expect(summary.powerDown?.weeksRemaining).toBe(8);
    expect(summary.powerDown?.weeksTotal).toBe(13);
    expect(Number.parseFloat(summary.powerDown?.toWithdrawHp.replace(/,/g, '') ?? '0')).toBeCloseTo(
      1902.163,
      2,
    );
    expect(Number.parseFloat(summary.powerDown?.vestingWithdrawRateHp.replace(/,/g, '') ?? '0')).toBeCloseTo(
      146.32,
      1,
    );
  });

  it('treats a just-started power down (withdrawn=0) as 13 weeks remaining', () => {
    expect(
      calculateHivePowerDownWeeksRemainingFromVests(
        3071869229505,
        '236297.633039 VESTS',
        0,
      ),
    ).toBe(13);
  });

  it('formats RC when max_rc is numeric from rc_api', () => {
    const balance = mapHiveAccountToBalanceFields(
      { balance: '1 HIVE', vesting_shares: '0 VESTS' },
      CHAIN,
      432_210_000_000,
    );

    const summary = buildHiveWalletSummary(
      balance,
      { hiveUsd: 1, hbdUsd: 1 },
      {
        canClaimInterest: false,
        daysUntilInterestClaim: 0,
        nextVestingWithdrawal: null,
        pendingSavingsWithdrawals: [],
        pendingRewards: EMPTY_PENDING_REWARDS,
        rc: mapRcAccountToSnapshot({
          max_rc: '432210000000',
          delegated_rc: '1000000000',
          received_delegated_rc: '0',
          rc_manabar: { current_mana: '120000000000' },
        }),
      },
    );

    expect(summary.display.rcMax).toBe('433.21');
    expect(summary.flags.showRcDelegationsRow).toBe(true);
  });
});

describe('mapPendingRewards', () => {
  it('TC-001: pending HP display uses current VESTS conversion', () => {
    const rewards = mapPendingRewards(
      {
        reward_vesting_balance: '1800.000000 VESTS',
        reward_vesting_hive: '0.000 HP',
      },
      PENDING_REWARDS_CHAIN,
    );

    expect(rewards.display.hp).toBe('1.8');
  });

  it('TC-002: ignores reward_vesting_hive when it disagrees with vestToHp', () => {
    const rewards = mapPendingRewards(
      {
        reward_vesting_balance: '1800.000000 VESTS',
        reward_vesting_hive: '6.739 HP',
      },
      PENDING_REWARDS_CHAIN,
    );

    expect(rewards.display.hp).toBe('1.8');
    expect(rewards.display.hp).not.toBe('6.739');
  });

  it('TC-003: broadcast vesting string is not converted', () => {
    const rewards = mapPendingRewards(
      {
        reward_vesting_balance: '11180.891754 VESTS',
      },
      PENDING_REWARDS_CHAIN,
    );

    expect(rewards.vesting).toBe('11180.891754 VESTS');
  });

  it('TC-004: liquid HIVE and HBD display stay chain amounts', () => {
    const rewards = mapPendingRewards(
      {
        reward_hive_balance: '0.343 HIVE',
        reward_hbd_balance: '0.025 HBD',
      },
      PENDING_REWARDS_CHAIN,
    );

    expect(rewards.hive).toBe('0.343 HIVE');
    expect(rewards.hbd).toBe('0.025 HBD');
    expect(rewards.display.hive).toBe('0.343');
    expect(rewards.display.hbd).toBe('0.025');
  });

  it('TC-005: zero pending rewards stay claimable-false', () => {
    const rewards = mapPendingRewards({}, PENDING_REWARDS_CHAIN);

    expect(rewards.hasRewards).toBe(false);
    expect(rewards.hive).toBe('0.000 HIVE');
    expect(rewards.hbd).toBe('0.000 HBD');
    expect(rewards.vesting).toBe('0.000000 VESTS');
    expect(rewards.display.hp).toBe('0');
  });

  it('TC-006: vesting-only rewards are claimable even if booked HP field is zero', () => {
    const rewards = mapPendingRewards(
      {
        reward_vesting_balance: '1800.000000 VESTS',
        reward_vesting_hive: '0.000 HP',
      },
      PENDING_REWARDS_CHAIN,
    );

    expect(rewards.hasRewards).toBe(true);
    expect(rewards.display.hp).toBe('1.8');
  });

  it('TC-007: zero total vesting shares yields displayed HP 0 but keeps vesting claimable', () => {
    const rewards = mapPendingRewards(
      {
        reward_vesting_balance: '1800.000000 VESTS',
      },
      {
        totalVestingShares: '0 VESTS',
        totalVestingFundSteem: '1.000 HIVE',
      },
    );

    expect(rewards.display.hp).toBe('0');
    expect(rewards.hasRewards).toBe(true);
    expect(rewards.vesting).toBe('1800.000000 VESTS');
  });

  it('TC-008: missing vesting balance treats HP as 0', () => {
    const rewards = mapPendingRewards({}, PENDING_REWARDS_CHAIN);

    expect(rewards.vesting).toBe('0.000000 VESTS');
    expect(rewards.display.hp).toBe('0');
    expect(rewards.hasRewards).toBe(false);
  });

  it('TC-009: whitespace-only reward strings behave as zeros', () => {
    const rewards = mapPendingRewards(
      {
        reward_hive_balance: ' ',
        reward_hbd_balance: '',
        reward_vesting_balance: ' ',
      },
      PENDING_REWARDS_CHAIN,
    );

    expect(rewards.hasRewards).toBe(false);
    expect(rewards.hive).toBe('0.000 HIVE');
    expect(rewards.hbd).toBe('0.000 HBD');
    expect(rewards.vesting).toBe('0.000000 VESTS');
    expect(rewards.display.hp).toBe('0');
  });

  it('maps non-zero reward balances for display and broadcast', () => {
    const rewards = mapPendingRewards(
      {
        reward_hive_balance: '0.734 HIVE',
        reward_hbd_balance: '0.012 HBD',
        reward_vesting_balance: '1800.000000 VESTS',
        reward_vesting_hive: '1.800 HP',
      },
      PENDING_REWARDS_CHAIN,
    );

    expect(rewards.hasRewards).toBe(true);
    expect(rewards.hive).toBe('0.734 HIVE');
    expect(rewards.hbd).toBe('0.012 HBD');
    expect(rewards.vesting).toBe('1800.000000 VESTS');
    expect(rewards.display.hive).toBe('0.734');
    expect(rewards.display.hbd).toBe('0.012');
    expect(rewards.display.hp).toBe('1.8');
  });
});

describe('delegatableHp', () => {
  function balance(
    account: Parameters<typeof mapHiveAccountToBalanceFields>[0],
  ) {
    return mapHiveAccountToBalanceFields(account, CHAIN, '0');
  }

  it('TC-001 subtracts outgoing delegation and only the remaining power down', () => {
    const fields = balance({
      vesting_shares: '400.000000 VESTS',
      delegated_vesting_shares: '100.000000 VESTS',
      received_vesting_shares: '0.000000 VESTS',
      to_withdraw: 10_000_000,
      withdrawn: 4_000_000,
    });
    const summary = buildHiveWalletSummary(
      fields,
      { hiveUsd: 1, hbdUsd: 1 },
      {
        canClaimInterest: false,
        daysUntilInterestClaim: 0,
        nextVestingWithdrawal: null,
        pendingSavingsWithdrawals: [],
        pendingRewards: EMPTY_PENDING_REWARDS,
      },
    );

    expect(Number.parseFloat(fields.delegatableHp)).toBe(147);
    expect(summary.display.hivePower).toBe('200');
  });

  it('TC-002 ignores received vesting', () => {
    const fields = balance({
      vesting_shares: '400.000000 VESTS',
      received_vesting_shares: '200.000000 VESTS',
      delegated_vesting_shares: '0.000000 VESTS',
      to_withdraw: 0,
      withdrawn: 0,
    });

    expect(Number.parseFloat(fields.delegatableHp)).toBe(200);
  });

  it('TC-011 treats VESTS strings the same as micro-VEST integers', () => {
    const fields = balance({
      vesting_shares: '400.000000 VESTS',
      delegated_vesting_shares: '100.000000 VESTS',
      to_withdraw: '10.000000 VESTS',
      withdrawn: '4.000000 VESTS',
    });

    expect(Number.parseFloat(fields.delegatableHp)).toBe(147);
  });

  it('TC-012 floors at zero when delegated vesting exceeds own vesting', () => {
    const fields = balance({
      vesting_shares: '100.000000 VESTS',
      delegated_vesting_shares: '200.000000 VESTS',
      to_withdraw: 0,
      withdrawn: 0,
    });

    expect(Number.parseFloat(fields.delegatableHp)).toBe(0);
  });

  it('TC-013 does not add HP when withdrawn exceeds to_withdraw', () => {
    const fields = balance({
      vesting_shares: '400.000000 VESTS',
      delegated_vesting_shares: '0.000000 VESTS',
      to_withdraw: 4_000_000,
      withdrawn: 10_000_000,
    });

    expect(Number.parseFloat(fields.delegatableHp)).toBe(200);
  });

  it('TC-014 reports zero delegatable HP for an empty balance', () => {
    expect(emptyHiveBalance().delegatableHp).toBe('0');
  });
});
