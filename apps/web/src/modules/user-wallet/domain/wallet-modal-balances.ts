import type { EngineWalletSummaryView } from './types/engine-wallet-view';
import type { HiveWalletSummaryView } from './types/hive-wallet-view';
import type { WaivWalletSummaryView } from './types/waiv-wallet-view';
import {
  isEngineTokenAsset,
  type WalletMainAsset,
  type WalletTransferAsset,
} from './wallet-modal-types';
import { HIVE_RC_DELEGATOR_RESERVE } from '../constants/hive-rc';
import { findEngineTokenUsdRate } from './wallet-engine-usd-rate';
import { HIVE_DELEGATION_RETURN_DAYS } from './hive-delegation-return-days';
import {
  getWalletDelegateAmountAssetLabel,
  getWalletPowerDownBalanceSymbol,
} from './wallet-power-labels';
import { truncateHiveAmountForInput } from './hive-wallet-amount';
import { WAIV_DELEGATION_RETURN_DAYS } from './waiv-delegation-return-days';

export type WalletAmountValidation = 'engine' | 'hive';

export type WalletTransferBalanceConfig = {
  maxAmount: string;
  tokenUsdRate: number;
  validation: WalletAmountValidation;
  symbol: WalletTransferAsset;
};

export type WalletPowerBalanceConfig = {
  maxAmount: string;
  balanceSymbol: string;
  validation: WalletAmountValidation;
};

export type WalletDelegateBalanceConfig = WalletPowerBalanceConfig & {
  tokenUsdRate: number;
  returnDays: number;
};

function findEngineTokenRow(
  engineSummary: EngineWalletSummaryView | null | undefined,
  symbol: string,
) {
  if (!engineSummary) {
    return null;
  }
  return (
    [...engineSummary.pinnedTokens, ...engineSummary.tokens].find(
      (row) => row.symbol === symbol,
    ) ?? null
  );
}

export function findPowerEligibleEngineRow(
  engineSummary: EngineWalletSummaryView | null | undefined,
  symbol: string,
) {
  if (!engineSummary) {
    return null;
  }
  const fromPowerList = engineSummary.powerEligibleTokens?.find(
    (row) => row.symbol === symbol,
  );
  if (fromPowerList) {
    return fromPowerList;
  }
  const fromPinned = engineSummary.pinnedTokens.find(
    (row) => row.symbol === symbol,
  );
  if (fromPinned) {
    return fromPinned;
  }
  return findEngineTokenRow(engineSummary, symbol);
}

function listEnginePowerEligibleRows(
  engineSummary: EngineWalletSummaryView | null | undefined,
) {
  if (!engineSummary) {
    return [];
  }
  if ((engineSummary.powerEligibleTokens?.length ?? 0) > 0) {
    return engineSummary.powerEligibleTokens ?? [];
  }
  return [...engineSummary.pinnedTokens, ...engineSummary.tokens].filter(
    (row) =>
      row.stakingEnabled &&
      (Number.parseFloat(row.balance) > 0 ||
        Number.parseFloat(row.stake) > 0),
  );
}

export function getWalletTransferBalanceConfig(
  asset: WalletTransferAsset,
  savings: 'none' | 'to' | 'from',
  waiv: WaivWalletSummaryView | null,
  hive: HiveWalletSummaryView | null,
  engineSummary?: EngineWalletSummaryView | null,
): WalletTransferBalanceConfig | null {
  if (isEngineTokenAsset(asset)) {
    if (savings !== 'none') {
      return null;
    }
    if (asset === 'WAIV' && waiv) {
      return {
        maxAmount: waiv.balance.liquid,
        tokenUsdRate: waiv.rates.waivUsd,
        validation: 'engine',
        symbol: asset,
      };
    }
    const row = findEngineTokenRow(engineSummary, asset);
    if (!row) {
      return null;
    }
    return {
      maxAmount: row.balance,
      tokenUsdRate: row.usdEstimate,
      validation: 'engine',
      symbol: asset,
    };
  }

  if (!hive) {
    return null;
  }

  if (asset === 'HIVE') {
    if (savings === 'from') {
      return {
        maxAmount: hive.balance.hiveSavings,
        tokenUsdRate: hive.rates.hiveUsd,
        validation: 'hive',
        symbol: 'HIVE',
      };
    }
    return {
      maxAmount: hive.balance.liquidHive,
      tokenUsdRate: hive.rates.hiveUsd,
      validation: 'hive',
      symbol: 'HIVE',
    };
  }

  if (savings === 'from') {
    return {
      maxAmount: hive.balance.hbdSavings,
      tokenUsdRate: hive.rates.hbdUsd,
      validation: 'hive',
      symbol: 'HBD',
    };
  }

  return {
    maxAmount: hive.balance.hbdLiquid,
    tokenUsdRate: hive.rates.hbdUsd,
    validation: 'hive',
    symbol: 'HBD',
  };
}

export function getWalletPowerBalanceConfig(
  asset: WalletMainAsset,
  mode: 'up' | 'down',
  waiv: WaivWalletSummaryView | null,
  hive: HiveWalletSummaryView | null,
  engineSummary?: EngineWalletSummaryView | null,
): WalletPowerBalanceConfig | null {
  if (isEngineTokenAsset(asset)) {
    if (asset === 'WAIV' && waiv) {
      return {
        maxAmount: mode === 'up' ? waiv.balance.liquid : waiv.balance.stake,
        balanceSymbol: getWalletPowerDownBalanceSymbol(asset, mode),
        validation: 'engine',
      };
    }
    const row = findPowerEligibleEngineRow(engineSummary, asset);
    if (!row || !row.stakingEnabled) {
      return null;
    }
    return {
      maxAmount: mode === 'up' ? row.balance : row.stake,
      balanceSymbol: getWalletPowerDownBalanceSymbol(asset, mode),
      validation: 'engine',
    };
  }

  if (!hive) {
    return null;
  }

  return {
    maxAmount: mode === 'up' ? hive.balance.liquidHive : hive.balance.hivePower,
    balanceSymbol: getWalletPowerDownBalanceSymbol(asset, mode),
    validation: 'hive',
  };
}

function resolveHiveUsdRate(
  hive: HiveWalletSummaryView,
  engineSummary?: EngineWalletSummaryView | null,
): number {
  if (Number.isFinite(hive.rates.hiveUsd) && hive.rates.hiveUsd > 0) {
    return hive.rates.hiveUsd;
  }
  const engineHiveUsd = engineSummary?.rates.hiveUsd ?? 0;
  if (engineHiveUsd > 0) {
    return engineHiveUsd;
  }
  return 0;
}

export function getWalletDelegateBalanceConfig(
  asset: WalletMainAsset,
  waiv: WaivWalletSummaryView | null,
  hive: HiveWalletSummaryView | null,
  engineSummary?: EngineWalletSummaryView | null,
): WalletDelegateBalanceConfig | null {
  const balanceSymbol = getWalletDelegateAmountAssetLabel(asset);

  if (isEngineTokenAsset(asset)) {
    if (asset === 'WAIV' && waiv) {
      return {
        maxAmount: waiv.balance.stake,
        balanceSymbol,
        validation: 'engine',
        tokenUsdRate: waiv.rates.waivUsd,
        returnDays: WAIV_DELEGATION_RETURN_DAYS,
      };
    }
    const row = findEngineTokenRow(engineSummary, asset);
    if (!row) {
      return null;
    }
    return {
      maxAmount: row.stake,
      balanceSymbol,
      validation: 'engine',
      tokenUsdRate: findEngineTokenUsdRate(
        asset,
        waiv?.rates.waivUsd ?? 0,
        engineSummary ?? null,
      ),
      returnDays: WAIV_DELEGATION_RETURN_DAYS,
    };
  }

  if (!hive) {
    return null;
  }

  return {
    maxAmount: truncateHiveAmountForInput(
      hive.balance.delegatableHp ?? hive.balance.hivePower,
    ),
    balanceSymbol,
    validation: 'hive',
    tokenUsdRate: resolveHiveUsdRate(hive, engineSummary),
    returnDays: HIVE_DELEGATION_RETURN_DAYS,
  };
}

function listEngineTransferAssets(
  engineSummary: EngineWalletSummaryView | null | undefined,
): WalletTransferAsset[] {
  if (!engineSummary) {
    return [];
  }
  return [...engineSummary.pinnedTokens, ...engineSummary.tokens]
    .filter((row) => Number.parseFloat(row.balance) > 0)
    .map((row) => row.symbol);
}

function listEnginePowerAssets(
  engineSummary: EngineWalletSummaryView | null | undefined,
): WalletMainAsset[] {
  if (!engineSummary) {
    return [];
  }
  return [...engineSummary.pinnedTokens, ...engineSummary.tokens]
    .filter((row) => row.stakingEnabled)
    .filter(
      (row) =>
        Number.parseFloat(row.balance) > 0 || Number.parseFloat(row.stake) > 0,
    )
    .map((row) => row.symbol);
}

export function listWalletTransferAssetOptions(
  savings: 'none' | 'to' | 'from',
  waiv: WaivWalletSummaryView | null,
  hive: HiveWalletSummaryView | null,
  engineSummary?: EngineWalletSummaryView | null,
): WalletTransferAsset[] {
  if (savings === 'to' || savings === 'from') {
    return ['HIVE', 'HBD'];
  }

  const options: WalletTransferAsset[] = [];
  if (waiv) {
    options.push('WAIV');
  }
  if (hive) {
    options.push('HIVE');
    options.push('HBD');
  }
  for (const symbol of listEngineTransferAssets(engineSummary)) {
    if (
      symbol === 'WAIV' ||
      symbol === 'HIVE' ||
      symbol === 'HBD' ||
      options.includes(symbol)
    ) {
      continue;
    }
    options.push(symbol);
  }
  return options;
}

export function listWalletMainAssetOptions(
  waiv: WaivWalletSummaryView | null,
  hive: HiveWalletSummaryView | null,
  engineSummary?: EngineWalletSummaryView | null,
): WalletMainAsset[] {
  const options: WalletMainAsset[] = [];
  if (waiv) {
    options.push('WAIV');
  }
  if (hive) {
    options.push('HIVE');
  }
  for (const symbol of listEnginePowerAssets(engineSummary)) {
    if (symbol === 'WAIV' || symbol === 'HIVE' || options.includes(symbol)) {
      continue;
    }
    options.push(symbol);
  }
  return options;
}

/** Manage-delegations modal only supports WAIV (WP) and HIVE (HP) lists. */
export function listWalletManageDelegationsAssetOptions(
  waiv: WaivWalletSummaryView | null,
  hive: HiveWalletSummaryView | null,
): WalletMainAsset[] {
  const options: WalletMainAsset[] = [];
  if (waiv) {
    options.push('WAIV');
  }
  if (hive) {
    options.push('HIVE');
  }
  return options;
}

export function listWalletPowerAssetOptions(
  mode: 'up' | 'down',
  waiv: WaivWalletSummaryView | null,
  hive: HiveWalletSummaryView | null,
  engineSummary?: EngineWalletSummaryView | null,
): WalletMainAsset[] {
  const options: WalletMainAsset[] = [];

  for (const row of listEnginePowerEligibleRows(engineSummary)) {
    const liquid = Number.parseFloat(row.balance);
    const stake = Number.parseFloat(row.stake);
    const eligible =
      mode === 'up' ? liquid > 0 : stake > 0;
    if (
      !eligible ||
      row.symbol === 'WAIV' ||
      row.symbol === 'HIVE' ||
      options.includes(row.symbol)
    ) {
      continue;
    }
    options.push(row.symbol);
  }

  const header: WalletMainAsset[] = [];
  if (waiv) {
    const waivEligible =
      mode === 'up'
        ? Number.parseFloat(waiv.balance.liquid) > 0
        : Number.parseFloat(waiv.balance.stake) > 0;
    if (waivEligible) {
      header.push('WAIV');
    }
  }
  if (hive) {
    const hiveEligible =
      mode === 'up'
        ? Number.parseFloat(hive.balance.liquidHive) > 0
        : Number.parseFloat(hive.balance.hivePower) > 0;
    if (hiveEligible) {
      header.push('HIVE');
    }
  }

  return [...header, ...options];
}

function parseRcInteger(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

export function getHiveDelegateRcMaxAmount(
  hive: HiveWalletSummaryView | null,
): string {
  if (!hive?.rc) {
    return '0';
  }
  const maxCapacity = parseRcInteger(hive.rc.maxCapacity);
  const received = parseRcInteger(hive.rc.receivedDelegatedRc ?? '0');
  const currentMana = parseRcInteger(hive.rc.currentMana);
  const ownMax = Math.max(0, maxCapacity - received);
  const capped = Math.min(ownMax, currentMana);
  const max = Math.max(0, capped - HIVE_RC_DELEGATOR_RESERVE);
  return max > 0 ? String(max) : '0';
}
