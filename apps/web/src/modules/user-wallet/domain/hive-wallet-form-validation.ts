import { isEngineTokenAmountWithinMax } from './engine-token-amount';
import {
  getMinHiveDelegationHp,
  isHiveDelegationHpAboveMinimum,
  parseHiveAmount,
} from './hive-wallet-amount';
import { hasHpDelegationEditChanged } from './wallet-edit-delegation';

export type HiveWalletFormValidationCode =
  | 'recipient_required'
  | 'amount_invalid'
  | 'amount_exceeds_max'
  | 'delegation_below_minimum'
  | 'delegation_unchanged';

export function parseHiveRcAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export type HiveDelegationChainContext = {
  totalVestingShares: string;
  totalVestingFundSteem: string;
};

export function validateHiveWalletRecipient(
  to: string,
): HiveWalletFormValidationCode | null {
  if (to.trim().length < 3) {
    return 'recipient_required';
  }
  return null;
}

export function validateHiveWalletAmount(
  amount: string,
  maxAmount: string,
): HiveWalletFormValidationCode | null {
  const parsed = parseHiveAmount(amount);
  if (parsed === null) {
    return 'amount_invalid';
  }
  if (!isEngineTokenAmountWithinMax(amount, maxAmount)) {
    return 'amount_exceeds_max';
  }
  return null;
}

export function validateHiveDelegationAmount(
  amount: string,
  maxAmount: string,
  chain: HiveDelegationChainContext,
): HiveWalletFormValidationCode | null {
  const parsed = parseHiveAmount(amount);
  if (parsed === null) {
    return 'amount_invalid';
  }
  if (
    !isHiveDelegationHpAboveMinimum(
      parsed,
      chain.totalVestingShares,
      chain.totalVestingFundSteem,
    )
  ) {
    return 'delegation_below_minimum';
  }
  if (!isEngineTokenAmountWithinMax(amount, maxAmount)) {
    return 'amount_exceeds_max';
  }
  return null;
}

/** Hive replaces the absolute vesting for a delegatee; the same total is not a new delegation. */
export function validateHiveDelegationUnchanged(
  amount: string,
  currentHp: string | null,
): HiveWalletFormValidationCode | null {
  if (!currentHp) {
    return null;
  }
  if (!hasHpDelegationEditChanged(currentHp, amount)) {
    return 'delegation_unchanged';
  }
  return null;
}

export function getHiveDelegationMinimumHp(
  chain: HiveDelegationChainContext,
): number {
  return getMinHiveDelegationHp(
    chain.totalVestingShares,
    chain.totalVestingFundSteem,
  );
}

export function hiveWalletFormValidationMessageKey(
  code: HiveWalletFormValidationCode,
): string {
  switch (code) {
    case 'recipient_required':
      return 'wallet_validation_recipient_required';
    case 'amount_invalid':
      return 'wallet_validation_amount_invalid';
    case 'amount_exceeds_max':
      return 'wallet_validation_amount_exceeds_max';
    case 'delegation_below_minimum':
      return 'wallet_validation_delegation_below_minimum';
    case 'delegation_unchanged':
      return 'wallet_validation_delegation_unchanged';
  }
}

export function validateHiveRcAmount(
  amount: string,
  maxRc: string,
): HiveWalletFormValidationCode | null {
  const parsed = parseHiveRcAmount(amount);
  if (parsed === null) {
    return 'amount_invalid';
  }
  const max = parseHiveRcAmount(maxRc);
  if (max === null || parsed > max) {
    return 'amount_exceeds_max';
  }
  return null;
}
