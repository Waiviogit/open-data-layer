import { formatEngineTokenQuantity } from './engine-token-amount';
import type { HiveHpDelegationsView } from './types/hive-wallet-view';
import type { EngineTokenDelegationsView } from './types/waiv-wallet-view';
import type { HiveWalletSummaryView } from './types/hive-wallet-view';
import type { WaivWalletSummaryView } from './types/waiv-wallet-view';
import type { WalletMainAsset } from './wallet-modal-types';
import { parseDelegationAmount } from './wallet-delegations-format';
import { parseHiveAmount, truncateHiveAmountForInput } from './hive-wallet-amount';

export type WaivDelegationEditOp =
  | { action: 'delegate'; to: string; quantity: string }
  | { action: 'undelegate'; from: string; quantity: string };

export function getWalletEditDelegationMaxAmount(
  asset: WalletMainAsset,
  delegatee: string,
  waivSummary: WaivWalletSummaryView | null,
  hiveSummary: HiveWalletSummaryView | null,
  waivData: EngineTokenDelegationsView | null,
  hiveData: HiveHpDelegationsView | null,
): string {
  if (asset === 'WAIV' && waivSummary && waivData) {
    const waivPower =
      parseDelegationAmount(waivSummary.balance.stake) +
      parseDelegationAmount(waivSummary.balance.delegationsOut);
    const otherOutgoing = waivData.outgoing
      .filter((row) => row.to !== delegatee)
      .reduce((sum, row) => sum + parseDelegationAmount(row.quantity), 0);
    const max = Math.max(0, waivPower - otherOutgoing);
    return formatEngineTokenQuantity(max);
  }

  if (asset === 'HIVE' && hiveSummary && hiveData) {
    const current = hiveData.outgoing
      .filter((row) => row.delegatee === delegatee)
      .reduce((sum, row) => sum + parseDelegationAmount(row.hp), 0);
    const delegatableHp = hiveSummary.balance.delegatableHp;
    if (delegatableHp != null) {
      return truncateHiveAmountForInput(
        parseDelegationAmount(delegatableHp) + current,
      );
    }
    const hivePower = parseDelegationAmount(hiveSummary.balance.hivePower);
    const otherOutgoing = hiveData.outgoing
      .filter((row) => row.delegatee !== delegatee)
      .reduce((sum, row) => sum + parseDelegationAmount(row.hp), 0);
    const max = Math.max(0, hivePower - otherOutgoing);
    return truncateHiveAmountForInput(max);
  }

  return '0';
}

export function parseEditDelegationAmount(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '0' || trimmed === '0.0' || trimmed === '0.00') {
    return 0;
  }
  const parsed = Number.parseFloat(trimmed.replace(/,/g, ''));
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

export function resolveWaivDelegationEditOp(
  delegatee: string,
  currentQuantity: string,
  nextAmount: string,
): WaivDelegationEditOp | null {
  const current = parseDelegationAmount(currentQuantity);
  const next = parseEditDelegationAmount(nextAmount);
  if (next === null) {
    return null;
  }
  if (next === current) {
    return null;
  }
  if (next === 0) {
    return {
      action: 'undelegate',
      from: delegatee,
      quantity: formatEngineTokenQuantity(current),
    };
  }
  if (next > current) {
    return {
      action: 'delegate',
      to: delegatee,
      quantity: formatEngineTokenQuantity(next - current),
    };
  }
  return {
    action: 'undelegate',
    from: delegatee,
    quantity: formatEngineTokenQuantity(current - next),
  };
}

export function parseHpEditDelegationAmount(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '0' || trimmed === '0.0' || trimmed === '0.000') {
    return 0;
  }
  return parseHiveAmount(trimmed);
}

export function hasHpDelegationEditChanged(
  currentQuantity: string,
  nextAmount: string,
): boolean {
  const current = parseHpEditDelegationAmount(currentQuantity);
  const next = parseHpEditDelegationAmount(nextAmount);
  if (current === null || next === null) {
    return true;
  }
  return current !== next;
}

export function validateEditDelegationAmount(
  amount: string,
  maxAmount: string,
): 'amount_invalid' | 'amount_exceeds_max' | null {
  const parsed = parseEditDelegationAmount(amount);
  if (parsed === null) {
    return 'amount_invalid';
  }
  const max = parseDelegationAmount(maxAmount);
  if (parsed > max) {
    return 'amount_exceeds_max';
  }
  return null;
}
