import { parseHiveVestsAmount, vestToHp } from '@opden-data-layer/core';

const ZERO = '0';
const SECONDS_PER_YEAR = 31_536_000;
const HBD_INTEREST_CLAIM_DAYS = 30;
const EPOCH_INTEREST_PAYMENT = '1970-01-01T00:00:00';
export const HIVE_POWER_DOWN_WEEKS_TOTAL = 13;
const RC_BILLION = 1_000_000_000;

export type HiveWalletRates = {
  hiveUsd: number;
  hbdUsd: number;
};

export type HiveWalletBalanceFields = {
  liquidHive: string;
  hivePower: string;
  /** HP that can still be delegated: own VESTS minus outgoing delegation minus remaining power down. */
  delegatableHp: string;
  delegationsNetHp: string;
  rcMax: string;
  hiveSavings: string;
  hbdLiquid: string;
  hbdSavings: string;
  hbdInterest: string;
  toWithdrawHp: string;
  vestingWithdrawRateHp: string;
};

export type HiveWalletChainContext = {
  totalVestingShares: string;
  totalVestingFundSteem: string;
  hbdInterestRatePercent: number;
};

export type HiveWalletAccountInput = {
  balance?: string;
  hbd_balance?: string;
  vesting_shares?: string;
  delegated_vesting_shares?: string;
  received_vesting_shares?: string;
  savings_balance?: string;
  savings_hbd_balance?: string;
  savings_hbd_seconds?: string;
  savings_hbd_seconds_last_update?: string;
  savings_hbd_last_interest_payment?: string;
  to_withdraw?: string | number;
  withdrawn?: string | number;
  vesting_withdraw_rate?: string | number;
  next_vesting_withdrawal?: string;
  reward_hive_balance?: string;
  reward_hbd_balance?: string;
  reward_vesting_balance?: string;
  reward_vesting_hive?: string;
};

export type HivePendingRewards = {
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

const ZERO_REWARD_HIVE = '0.000 HIVE';
const ZERO_REWARD_HBD = '0.000 HBD';
const ZERO_REWARD_VESTS = '0.000000 VESTS';

export type HivePendingRewardsChainContext = {
  totalVestingShares: string;
  totalVestingFundSteem: string;
};

export function mapPendingRewards(
  account: HiveWalletAccountInput,
  chain: HivePendingRewardsChainContext,
): HivePendingRewards {
  const hiveRaw = account.reward_hive_balance?.trim() || ZERO_REWARD_HIVE;
  const hbdRaw = account.reward_hbd_balance?.trim() || ZERO_REWARD_HBD;
  const vestingRaw = account.reward_vesting_balance?.trim() || ZERO_REWARD_VESTS;
  const hiveAmount = parseAssetNumber(hiveRaw);
  const hbdAmount = parseAssetNumber(hbdRaw);
  const vestingAmount = parseAssetNumber(vestingRaw);
  const hpAmount = vestToHp(
    vestingRaw,
    chain.totalVestingShares,
    chain.totalVestingFundSteem,
  );
  const hasRewards =
    hiveAmount > 0 || hbdAmount > 0 || vestingAmount > 0 || hpAmount > 0;

  return {
    hive: hiveRaw,
    hbd: hbdRaw,
    vesting: vestingRaw,
    display: {
      hive: formatAmount(hiveAmount, 3),
      hbd: formatAmount(hbdAmount, 3),
      hp: formatAmount(hpAmount, 3),
    },
    hasRewards,
  };
}

export type HiveRcSnapshot = {
  maxRc: number;
  delegatedRc: number;
  receivedDelegatedRc: number;
  currentMana: number;
};

export type HivePendingSavingsWithdrawal = {
  requestId: number;
  amount: string;
  asset: 'HIVE' | 'HBD';
  to: string;
  memo: string;
  complete?: string;
};

function parseRcNumber(value: string | number | undefined): number {
  if (value === undefined || value === null) {
    return 0;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatRcBillions(value: number): string {
  if (!Number.isFinite(value) || Math.abs(value) < 1e-9) {
    return '0';
  }
  return (value / RC_BILLION).toFixed(2);
}

function formatSignedRcBillions(value: number): string {
  if (Math.abs(value) < 1e-9) {
    return '0';
  }
  const abs = formatRcBillions(Math.abs(value));
  return value > 0 ? `+${abs}` : `-${abs}`;
}

export function mapRcAccountToSnapshot(input: {
  max_rc?: string;
  delegated_rc?: string;
  received_delegated_rc?: string;
  rc_manabar?: { current_mana?: string };
} | undefined): HiveRcSnapshot {
  return {
    maxRc: parseRcNumber(input?.max_rc),
    delegatedRc: parseRcNumber(input?.delegated_rc),
    receivedDelegatedRc: parseRcNumber(input?.received_delegated_rc),
    currentMana: parseRcNumber(input?.rc_manabar?.current_mana),
  };
}

export function calculateHivePowerDownWeeksRemaining(
  toWithdrawHp: number,
  vestingWithdrawRateHp: number,
): number {
  if (vestingWithdrawRateHp <= 0 || toWithdrawHp <= 0) {
    return 0;
  }
  return Math.ceil(toWithdrawHp / vestingWithdrawRateHp);
}

/** Weeks remaining from raw chain VESTS fields (independent of HP conversion). */
export function calculateHivePowerDownWeeksRemainingFromVests(
  toWithdraw: string | number | undefined,
  vestingWithdrawRate: string | number | undefined,
  withdrawn?: string | number,
): number {
  const toWithdrawVests = parseHiveVestsAmount(toWithdraw ?? '0 VESTS');
  const withdrawnVests = parseHiveVestsAmount(withdrawn ?? 0);
  const rateVests = parseHiveVestsAmount(vestingWithdrawRate ?? '0 VESTS');
  const remainingVests = toWithdrawVests - withdrawnVests;
  if (rateVests <= 0 || remainingVests <= 0) {
    return 0;
  }
  return Math.min(
    HIVE_POWER_DOWN_WEEKS_TOTAL,
    Math.max(0, Math.round(remainingVests / rateVests)),
  );
}

export function calculateSavingsWithdrawDaysRemaining(
  complete: string | undefined,
  nowMs = Date.now(),
): number | null {
  if (!complete || complete.startsWith('1970-01-01')) {
    return 0;
  }
  const targetMs = Date.parse(complete);
  if (!Number.isFinite(targetMs)) {
    return null;
  }
  const diffHours = (targetMs - nowMs) / (1000 * 60 * 60);
  if (diffHours <= 0) {
    return 0;
  }
  return diffHours > 24 ? Math.ceil(diffHours / 24) : 0;
}

/** Own VESTS still free to delegate. Received vesting is not included. */
function delegatableVestsToHp(
  account: HiveWalletAccountInput,
  totalVestingShares: string,
  totalVestingFund: string,
): number {
  const ownVests = parseHiveVestsAmount(account.vesting_shares ?? '0 VESTS');
  const delegatedVests = parseHiveVestsAmount(
    account.delegated_vesting_shares ?? '0 VESTS',
  );
  const toWithdrawVests = parseHiveVestsAmount(account.to_withdraw ?? 0);
  const withdrawnVests = parseHiveVestsAmount(account.withdrawn ?? 0);
  const poweringDownVests = Math.max(0, toWithdrawVests - withdrawnVests);
  const delegatableVests = Math.max(
    0,
    ownVests - delegatedVests - poweringDownVests,
  );
  return vestToHp(
    `${delegatableVests} VESTS`,
    totalVestingShares,
    totalVestingFund,
  );
}

function parseAssetNumber(value: string | number | undefined): number {
  if (value === undefined || value === null) {
    return 0;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  const numeric = value.trim().split(/\s+/)[0];
  const parsed = Number.parseFloat(numeric);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAmount(value: number, fractionDigits = 3): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  });
}

function formatSignedAmount(value: number, fractionDigits = 3): string {
  if (Math.abs(value) < 1e-9) {
    return '0';
  }
  const abs = formatAmount(Math.abs(value), fractionDigits);
  return value > 0 ? `+${abs}` : `-${abs}`;
}

function formatRc(rc: number): string {
  if (!Number.isFinite(rc) || rc <= 0) {
    return '0';
  }
  if (rc >= 1e9) {
    return `${(rc / 1e9).toFixed(2)}b`;
  }
  if (rc >= 1e6) {
    return `${(rc / 1e6).toFixed(2)}m`;
  }
  if (rc >= 1e3) {
    return `${(rc / 1e3).toFixed(2)}k`;
  }
  return formatAmount(rc, 0);
}

export function estimateHbdInterestBalance(input: {
  savingsHbdBalance: string;
  savingsHbdSeconds: string;
  savingsHbdSecondsLastUpdate: string;
  interestRatePercent: number;
  nowMs?: number;
}): number {
  const hbdBalance = parseAssetNumber(input.savingsHbdBalance);
  if (hbdBalance <= 0 || input.interestRatePercent <= 0) {
    return 0;
  }
  const hbdSeconds = parseAssetNumber(input.savingsHbdSeconds) / 1000;
  const lastUpdateMs = Date.parse(input.savingsHbdSecondsLastUpdate);
  const nowSeconds = Math.floor((input.nowMs ?? Date.now()) / 1000);
  const lastUpdateSeconds = Number.isFinite(lastUpdateMs)
    ? Math.floor(lastUpdateMs / 1000)
    : nowSeconds;
  const interest =
    ((hbdSeconds + (nowSeconds - lastUpdateSeconds) * hbdBalance) *
      (input.interestRatePercent / 100)) /
    SECONDS_PER_YEAR;
  return interest < 0.001 ? 0 : interest;
}

export function canClaimHbdInterest(
  lastInterestPayment: string | undefined,
  nowMs = Date.now(),
): boolean {
  if (!lastInterestPayment || lastInterestPayment.startsWith(EPOCH_INTEREST_PAYMENT)) {
    return true;
  }
  const lastMs = Date.parse(lastInterestPayment);
  if (!Number.isFinite(lastMs)) {
    return true;
  }
  const daysSince = (nowMs - lastMs) / (1000 * 60 * 60 * 24);
  return daysSince >= HBD_INTEREST_CLAIM_DAYS;
}

export function daysUntilHbdInterestClaim(
  lastInterestPayment: string | undefined,
  nowMs = Date.now(),
): number {
  if (canClaimHbdInterest(lastInterestPayment, nowMs)) {
    return 0;
  }
  const lastMs = Date.parse(lastInterestPayment ?? '');
  if (!Number.isFinite(lastMs)) {
    return 0;
  }
  const daysSince = (nowMs - lastMs) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(HBD_INTEREST_CLAIM_DAYS - daysSince));
}

export function mapHiveAccountToBalanceFields(
  account: HiveWalletAccountInput,
  chain: HiveWalletChainContext,
  rcMax: string | number,
): HiveWalletBalanceFields {
  const totalVestingShares = chain.totalVestingShares;
  const totalVestingFund = chain.totalVestingFundSteem;

  const hivePower = vestToHp(
    account.vesting_shares ?? '0 VESTS',
    totalVestingShares,
    totalVestingFund,
  );
  const receivedHp = vestToHp(
    account.received_vesting_shares ?? '0 VESTS',
    totalVestingShares,
    totalVestingFund,
  );
  const delegatedHp = vestToHp(
    account.delegated_vesting_shares ?? '0 VESTS',
    totalVestingShares,
    totalVestingFund,
  );
  const delegationsNetHp = receivedHp - delegatedHp;
  const toWithdrawHp = vestToHp(
    account.to_withdraw ?? '0 VESTS',
    totalVestingShares,
    totalVestingFund,
  );
  const vestingWithdrawRateHp = vestToHp(
    account.vesting_withdraw_rate ?? '0 VESTS',
    totalVestingShares,
    totalVestingFund,
  );
  const delegatableHp = delegatableVestsToHp(
    account,
    totalVestingShares,
    totalVestingFund,
  );

  const interest = estimateHbdInterestBalance({
    savingsHbdBalance: account.savings_hbd_balance ?? '0 HBD',
    savingsHbdSeconds: account.savings_hbd_seconds ?? '0',
    savingsHbdSecondsLastUpdate:
      account.savings_hbd_seconds_last_update ?? EPOCH_INTEREST_PAYMENT,
    interestRatePercent: chain.hbdInterestRatePercent,
  });

  return {
    liquidHive: String(parseAssetNumber(account.balance)),
    hivePower: String(hivePower),
    delegatableHp: String(delegatableHp),
    delegationsNetHp: String(delegationsNetHp),
    rcMax: typeof rcMax === 'number' ? String(rcMax) : rcMax,
    hiveSavings: String(parseAssetNumber(account.savings_balance)),
    hbdLiquid: String(parseAssetNumber(account.hbd_balance)),
    hbdSavings: String(parseAssetNumber(account.savings_hbd_balance)),
    hbdInterest: String(interest),
    toWithdrawHp: String(toWithdrawHp),
    vestingWithdrawRateHp: String(vestingWithdrawRateHp),
  };
}

export function buildHiveWalletSummary(
  balance: HiveWalletBalanceFields,
  rates: HiveWalletRates,
  options: {
    canClaimInterest: boolean;
    daysUntilInterestClaim: number;
    nextVestingWithdrawal: string | null;
    pendingSavingsWithdrawals: HivePendingSavingsWithdrawal[];
    pendingRewards: HivePendingRewards;
    rc?: HiveRcSnapshot;
    toWithdrawVests?: string | number;
    withdrawnVests?: string | number;
    vestingWithdrawRateVests?: string | number;
  },
) {
  const liquidHive = parseAssetNumber(balance.liquidHive);
  const hivePower = parseAssetNumber(balance.hivePower);
  const delegationsNetHp = parseAssetNumber(balance.delegationsNetHp);
  const rcMax = parseAssetNumber(balance.rcMax);
  const hiveSavings = parseAssetNumber(balance.hiveSavings);
  const hbdLiquid = parseAssetNumber(balance.hbdLiquid);
  const hbdSavings = parseAssetNumber(balance.hbdSavings);
  const hbdInterest = parseAssetNumber(balance.hbdInterest);
  const toWithdrawHp = parseAssetNumber(balance.toWithdrawHp);
  const vestingWithdrawRateHp = parseAssetNumber(balance.vestingWithdrawRateHp);

  const estUsd = rates.hiveUsd * (liquidHive + hivePower) + rates.hbdUsd * hbdLiquid;

  const showDelegationsRow = Math.abs(delegationsNetHp) >= 1e-9;
  const showPowerDownRow = toWithdrawHp > 0;
  const showInterestRow = hbdInterest > 0;
  const showHiveSavingsPending =
    options.pendingSavingsWithdrawals.some((row) => row.asset === 'HIVE') ||
    hiveSavings > 0;
  const showHbdSavingsPending =
    options.pendingSavingsWithdrawals.some((row) => row.asset === 'HBD') ||
    hbdSavings > 0;

  const rc = options.rc;
  const rcTotalOwned = rc ? rc.maxRc + rc.delegatedRc : rcMax;
  const rcDelegationsNet = rc ? rc.receivedDelegatedRc - rc.delegatedRc : 0;
  const showRcDelegationsRow = rc
    ? rc.receivedDelegatedRc !== 0 || rc.delegatedRc !== 0
    : false;
  const powerDownWeeksRemaining = showPowerDownRow
    ? calculateHivePowerDownWeeksRemainingFromVests(
        options.toWithdrawVests,
        options.vestingWithdrawRateVests,
        options.withdrawnVests,
      )
    : 0;

  return {
    balance,
    display: {
      liquidHive: formatAmount(liquidHive),
      hivePower: formatAmount(hivePower),
      delegationsNetHp: formatSignedAmount(delegationsNetHp),
      rcMax: rc ? formatRcBillions(rcTotalOwned) : formatRc(rcMax),
      rcDelegationsNet: formatSignedRcBillions(rcDelegationsNet),
      hiveSavings: formatAmount(hiveSavings),
      hbdLiquid: formatAmount(hbdLiquid, 3),
      hbdSavings: formatAmount(hbdSavings, 3),
      hbdInterest: formatAmount(hbdInterest, 3),
      estAccountValueUsd: formatAmount(estUsd, 2),
    },
    flags: {
      showDelegationsRow,
      showPowerDownRow,
      showInterestRow,
      showHiveSavingsPending,
      showHbdSavingsPending,
      showRcDelegationsRow,
    },
    rc: rc
      ? {
          totalOwned: String(rcTotalOwned),
          maxCapacity: String(rc.maxRc),
          currentMana: String(rc.currentMana),
          delegatedRc: String(rc.delegatedRc),
          receivedDelegatedRc: String(rc.receivedDelegatedRc),
        }
      : undefined,
    powerDown: showPowerDownRow
      ? {
          toWithdrawHp: formatAmount(toWithdrawHp),
          vestingWithdrawRateHp: formatAmount(vestingWithdrawRateHp),
          nextVestingWithdrawal: options.nextVestingWithdrawal,
          weeksRemaining: powerDownWeeksRemaining,
          weeksTotal: HIVE_POWER_DOWN_WEEKS_TOTAL,
        }
      : undefined,
    interest: showInterestRow
      ? {
          canClaim: options.canClaimInterest,
          daysUntilClaim: options.daysUntilInterestClaim,
        }
      : undefined,
    pendingSavingsWithdrawals: options.pendingSavingsWithdrawals.map((row) => ({
      ...row,
      daysRemaining: calculateSavingsWithdrawDaysRemaining(row.complete),
    })),
    pendingRewards: options.pendingRewards,
  };
}

export function emptyHiveBalance(): HiveWalletBalanceFields {
  return {
    liquidHive: ZERO,
    hivePower: ZERO,
    delegatableHp: ZERO,
    delegationsNetHp: ZERO,
    rcMax: ZERO,
    hiveSavings: ZERO,
    hbdLiquid: ZERO,
    hbdSavings: ZERO,
    hbdInterest: ZERO,
    toWithdrawHp: ZERO,
    vestingWithdrawRateHp: ZERO,
  };
}

export function parseSavingsWithdrawAsset(amount: string): 'HIVE' | 'HBD' {
  const upper = amount.toUpperCase();
  if (upper.includes('HBD')) {
    return 'HBD';
  }
  return 'HIVE';
}
