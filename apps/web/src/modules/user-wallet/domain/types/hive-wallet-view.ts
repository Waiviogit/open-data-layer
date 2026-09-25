export type HivePendingRewardsView = {
  hive: string;
  hbd: string;
  vesting: string;
  display: {
    hive: string;
    hbd: string;
    hp: string;
  };
  hasRewards: boolean;
};

export type HiveWalletSummaryView = {
  account: string;
  balance: {
    liquidHive: string;
    hivePower: string;
    /** Present when query-api computed HP still free to delegate. */
    delegatableHp?: string;
    delegationsNetHp: string;
    rcMax: string;
    hiveSavings: string;
    hbdLiquid: string;
    hbdSavings: string;
    hbdInterest: string;
    toWithdrawHp: string;
    vestingWithdrawRateHp: string;
  };
  display: {
    liquidHive: string;
    hivePower: string;
    delegationsNetHp: string;
    rcMax: string;
    rcDelegationsNet?: string;
    hiveSavings: string;
    hbdLiquid: string;
    hbdSavings: string;
    hbdInterest: string;
    estAccountValueUsd: string;
  };
  flags: {
    showDelegationsRow: boolean;
    showPowerDownRow: boolean;
    showInterestRow: boolean;
    showHiveSavingsPending: boolean;
    showHbdSavingsPending: boolean;
    showRcDelegationsRow: boolean;
  };
  rc?: {
    totalOwned: string;
    maxCapacity: string;
    currentMana: string;
    delegatedRc: string;
    receivedDelegatedRc: string;
  };
  powerDown?: {
    toWithdrawHp: string;
    vestingWithdrawRateHp: string;
    nextVestingWithdrawal: string | null;
    weeksRemaining: number;
    weeksTotal: number;
  };
  interest?: {
    canClaim: boolean;
    daysUntilClaim: number;
  };
  pendingSavingsWithdrawals: Array<{
    requestId: number;
    amount: string;
    asset: 'HIVE' | 'HBD';
    to: string;
    memo: string;
    complete?: string;
    daysRemaining?: number | null;
  }>;
  chain: {
    totalVestingShares: string;
    totalVestingFundSteem: string;
  };
  rates: {
    hiveUsd: number;
    hbdUsd: number;
  };
  pendingRewards: HivePendingRewardsView;
};

export type HiveWalletLoadError = 'unavailable' | 'invalid_response';

export type HiveWalletQueryResult = {
  summary: HiveWalletSummaryView | null;
  error: HiveWalletLoadError | null;
};

export type HiveHpDelegationItemView = {
  delegator: string;
  delegatee: string;
  vestingShares: string;
  hp: string;
  minDelegationTime: string;
};

export type HiveHpDelegationExpirationItemView = {
  delegator: string;
  vestingShares: string;
  hp: string;
  completionDate: string;
};

export type HiveHpDelegationsView = {
  account: string;
  incoming: HiveHpDelegationItemView[];
  outgoing: HiveHpDelegationItemView[];
  expirations?: HiveHpDelegationExpirationItemView[];
};

export type HiveRcDelegationItemView = {
  from: string;
  to: string;
  delegatedRc: number;
};

export type HiveRcDelegationsView = {
  account: string;
  incoming: HiveRcDelegationItemView[];
  outgoing: HiveRcDelegationItemView[];
};
