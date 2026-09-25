'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { buildDelegateVestingSharesOp } from '@opden-data-layer/hive-broadcast';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { UserRefSearchField } from '@/modules/object-updates/presentation/components/user-ref-search-field';
import { interpolateMessage } from '@/modules/user-activity/presentation/utils/interpolate-message';
import { AppModal, AppModalCloseButton } from '@/shared/presentation';

import {
  engineTokenFormValidationMessageKey,
  validateEngineTokenAmount,
  validateEngineTokenRecipient,
} from '../../../domain/engine-token-form-validation';
import {
  formatEngineTokenQuantity,
  formatEngineTokenUsdEstimate,
  parseEngineTokenAmount,
} from '../../../domain/engine-token-amount';
import {
  getHiveDelegationMinimumHp,
  hiveWalletFormValidationMessageKey,
  validateHiveDelegationAmount,
  validateHiveDelegationUnchanged,
  validateHiveWalletRecipient,
} from '../../../domain/hive-wallet-form-validation';
import {
  formatHiveAmount,
  estimateHiveUsdValue,
  hpToVestingShares,
  parseHiveAmount,
  truncateHiveAmountForInput,
} from '../../../domain/hive-wallet-amount';
import { getWalletEditDelegationMaxAmount } from '../../../domain/wallet-edit-delegation';
import type { HiveHpDelegationsView } from '../../../domain/types/hive-wallet-view';
import {
  getWalletDelegateBalanceConfig,
  listWalletMainAssetOptions,
} from '../../../domain/wallet-modal-balances';
import { getWalletDelegateAmountAssetLabel } from '../../../domain/wallet-power-labels';
import type {
  WalletDelegateModalState,
  WalletMainAsset,
} from '../../../domain/wallet-modal-types';
import { isEngineTokenAsset } from '../../../domain/wallet-modal-types';
import { useEngineTokenBroadcast } from '../../hooks/use-engine-token-broadcast';
import { useHiveBroadcast } from '../../hooks/use-hive-broadcast';
import { engineTokenBroadcastErrorMessageKey } from '../../utils/engine-token-broadcast-error-message';
import { WalletModalBalanceLine } from '../shared/wallet-modal-balance-line';
import { WalletModalFieldLabel } from '../shared/wallet-modal-field-label';
import { useWalletBalances } from './wallet-balances-context';
import { WalletAssetAmountField } from './wallet-asset-amount-field';

export type WalletDelegateModalProps = {
  open: boolean;
  onClose: () => void;
  account: string;
  state: WalletDelegateModalState;
};

export function WalletDelegateModal({
  open,
  onClose,
  account,
  state,
}: WalletDelegateModalProps) {
  const { t } = useI18n();
  const titleId = useId();
  const { waivSummary, hiveSummary, engineSummary } = useWalletBalances();
  const engineBroadcast = useEngineTokenBroadcast(account);
  const hiveBroadcast = useHiveBroadcast(account);

  const [asset, setAsset] = useState<WalletMainAsset>(state.asset);
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hiveDelegations, setHiveDelegations] =
    useState<HiveHpDelegationsView | null>(null);
  const prefilledDelegatee = useRef('');

  useEffect(() => {
    if (!open) {
      return;
    }
    setAsset(state.asset);
    setTo('');
    setAmount('');
    setValidationError(null);
    setHiveDelegations(null);
    prefilledDelegatee.current = '';
    engineBroadcast.setError(null);
    hiveBroadcast.setError(null);
  }, [open, state.asset]);

  useEffect(() => {
    if (!open || asset !== 'HIVE') {
      return;
    }
    const ac = new AbortController();
    void (async () => {
      try {
        const res = await fetch(
          `/api/users/${encodeURIComponent(account)}/wallet/hive/delegations`,
          { signal: ac.signal, cache: 'no-store' },
        );
        if (!res.ok) {
          return;
        }
        setHiveDelegations((await res.json()) as HiveHpDelegationsView);
      } catch {
        if (!ac.signal.aborted) {
          setHiveDelegations(null);
        }
      }
    })();
    return () => ac.abort();
  }, [account, asset, open]);

  const balanceConfig = useMemo(
    () =>
      getWalletDelegateBalanceConfig(
        asset,
        waivSummary,
        hiveSummary,
        engineSummary,
      ),
    [asset, waivSummary, hiveSummary, engineSummary],
  );

  const assetOptions = useMemo(() => {
    return listWalletMainAssetOptions(waivSummary, hiveSummary, engineSummary)
      .map((value) => {
        const config = getWalletDelegateBalanceConfig(
          value,
          waivSummary,
          hiveSummary,
          engineSummary,
        );
        return {
          value,
          label: getWalletDelegateAmountAssetLabel(value),
          balance: config?.maxAmount ?? '0',
          config,
        };
      })
      .filter(
        (row) =>
          row.config !== null &&
          Number.parseFloat(row.config.maxAmount) > 0,
      )
      .map(({ value, label, balance }) => ({ value, label, balance }));
  }, [engineSummary, hiveSummary, waivSummary]);

  const estimatedUsdAmount = useMemo(() => {
    if (!balanceConfig) {
      return '0.00';
    }
    if (balanceConfig.validation === 'hive') {
      const rate =
        balanceConfig.tokenUsdRate > 0
          ? balanceConfig.tokenUsdRate
          : (hiveSummary?.rates.hiveUsd ?? engineSummary?.rates.hiveUsd ?? 0);
      return estimateHiveUsdValue(amount, rate);
    }
    return formatEngineTokenUsdEstimate(amount, balanceConfig.tokenUsdRate);
  }, [amount, balanceConfig, engineSummary?.rates.hiveUsd, hiveSummary?.rates.hiveUsd]);

  const existingHpDelegation = useMemo(() => {
    if (asset !== 'HIVE' || !hiveDelegations) {
      return null;
    }
    const name = to.trim().toLowerCase();
    if (!name) {
      return null;
    }
    return (
      hiveDelegations.outgoing.find(
        (row) => row.delegatee.toLowerCase() === name,
      ) ?? null
    );
  }, [asset, hiveDelegations, to]);

  const maxAmount = useMemo(() => {
    if (asset === 'HIVE' && hiveSummary && hiveDelegations && to.trim()) {
      return getWalletEditDelegationMaxAmount(
        'HIVE',
        to.trim().toLowerCase(),
        null,
        hiveSummary,
        null,
        hiveDelegations,
      );
    }
    return balanceConfig?.maxAmount ?? '0';
  }, [asset, balanceConfig?.maxAmount, hiveDelegations, hiveSummary, to]);

  useEffect(() => {
    if (!existingHpDelegation) {
      return;
    }
    const name = existingHpDelegation.delegatee.toLowerCase();
    if (prefilledDelegatee.current === name) {
      return;
    }
    prefilledDelegatee.current = name;
    setAmount((current) =>
      current.trim() === ''
        ? truncateHiveAmountForInput(existingHpDelegation.hp)
        : current,
    );
  }, [existingHpDelegation]);

  const hiveDelegationMinHp = useMemo(() => {
    if (asset !== 'HIVE' || !hiveSummary) {
      return null;
    }
    return getHiveDelegationMinimumHp(hiveSummary.chain);
  }, [asset, hiveSummary]);

  const canSubmit = useMemo(() => {
    if (!balanceConfig) {
      return false;
    }
    const recipientOk = isEngineTokenAsset(asset)
        ? validateEngineTokenRecipient(to) === null
        : validateHiveWalletRecipient(to) === null;
    const amountOk =
      balanceConfig.validation === 'hive'
        ? hiveSummary &&
          validateHiveDelegationAmount(
            amount,
            maxAmount,
            hiveSummary.chain,
          ) === null &&
          validateHiveDelegationUnchanged(
            amount,
            existingHpDelegation?.hp ?? null,
          ) === null
        : validateEngineTokenAmount(amount, balanceConfig.maxAmount) === null;
    return recipientOk && amountOk;
  }, [
    amount,
    asset,
    balanceConfig,
    existingHpDelegation?.hp,
    hiveSummary,
    maxAmount,
    to,
  ]);

  const pending = engineBroadcast.pending || hiveBroadcast.pending;
  const error = engineBroadcast.error ?? hiveBroadcast.error;

  const onSubmit = async () => {
    engineBroadcast.setError(null);
    hiveBroadcast.setError(null);

    if (!balanceConfig) {
      return;
    }

    if (isEngineTokenAsset(asset)) {
      const recipientError = validateEngineTokenRecipient(to);
      if (recipientError) {
        setValidationError(t(engineTokenFormValidationMessageKey(recipientError)));
        return;
      }
    } else {
      const recipientError = validateHiveWalletRecipient(to);
      if (recipientError) {
        setValidationError(t(hiveWalletFormValidationMessageKey(recipientError)));
        return;
      }
    }

    if (balanceConfig.validation === 'hive') {
      const amountError = hiveSummary
        ? validateHiveDelegationAmount(
            amount,
            maxAmount,
            hiveSummary.chain,
          ) ??
          validateHiveDelegationUnchanged(
            amount,
            existingHpDelegation?.hp ?? null,
          )
        : 'amount_invalid';
      if (amountError) {
        const key = hiveWalletFormValidationMessageKey(amountError);
        setValidationError(
          amountError === 'delegation_below_minimum' && hiveSummary
            ? interpolateMessage(t(key), {
                minHp: formatHiveAmount(
                  getHiveDelegationMinimumHp(hiveSummary.chain),
                ),
              })
            : amountError === 'delegation_unchanged' && existingHpDelegation
              ? interpolateMessage(t(key), {
                  amount: truncateHiveAmountForInput(existingHpDelegation.hp),
                })
              : t(key),
        );
        return;
      }
    } else {
      const amountError = validateEngineTokenAmount(
        amount,
        balanceConfig.maxAmount,
      );
      if (amountError) {
        setValidationError(
          t(engineTokenFormValidationMessageKey(amountError)),
        );
        return;
      }
    }

    setValidationError(null);
    const recipient = to.trim().toLowerCase();

    if (isEngineTokenAsset(asset)) {
      const parsed = parseEngineTokenAmount(amount);
      if (parsed === null) {
        return;
      }
      const ok = await engineBroadcast.broadcast('delegate', {
        symbol: asset,
        quantity: formatEngineTokenQuantity(parsed),
        to: recipient,
      });
      if (ok) {
        onClose();
      }
      return;
    }

    const parsed = parseHiveAmount(amount);
    if (parsed === null || !hiveSummary) {
      return;
    }

    const op = buildDelegateVestingSharesOp({
      delegator: account,
      delegatee: recipient,
      vestingShares: hpToVestingShares(
        parsed,
        hiveSummary.chain.totalVestingShares,
        hiveSummary.chain.totalVestingFundSteem,
      ),
    });
    const ok = await hiveBroadcast.broadcast([op]);
    if (ok) {
      onClose();
    }
  };

  return (
    <AppModal open={open} onClose={onClose} labelledBy={titleId}>
      <div className="p-card-padding">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-section font-weight-strong text-fg">
            {t('delegate')}
          </h2>
          <AppModalCloseButton onClose={onClose} />
        </div>
        <div className="space-y-4">
          <div>
            <WalletModalFieldLabel>{t('target_account')}</WalletModalFieldLabel>
            <div className="mt-1">
              <UserRefSearchField
                value={to}
                onChange={(name) => {
                  setTo(name);
                  setValidationError(null);
                }}
                excludeAccountNames={[account]}
                fieldLabel={t('target_account')}
                searchPlaceholder={t('wallet_delegate_search_accounts')}
              />
            </div>
          </div>
          <WalletAssetAmountField
            label={t('amount_to_delegate')}
            value={amount}
            onChange={(value) => {
              setAmount(value);
              setValidationError(null);
            }}
            asset={asset}
            onAssetChange={(nextAsset) => {
              setAsset(nextAsset);
              setAmount('');
              setValidationError(null);
            }}
            options={assetOptions}
            maxAmount={maxAmount}
            searchableAsset
            showBalanceInAssetMenu
            showTokenOnlyOnAssetTrigger={false}
          />
          <p className="text-body-sm text-muted">
            {interpolateMessage(t('wallet_transfer_value_usd'), {
              amount: estimatedUsdAmount,
            })}
          </p>
          {balanceConfig ? (
            <WalletModalBalanceLine
              amount={maxAmount}
              symbol={balanceConfig.balanceSymbol}
              onSelect={() => setAmount(maxAmount)}
              labelKey="available"
            />
          ) : null}
          {existingHpDelegation ? (
            <p className="text-body-sm text-muted">
              {interpolateMessage(t('wallet_hive_delegate_replaces'), {
                amount: truncateHiveAmountForInput(existingHpDelegation.hp),
                account: existingHpDelegation.delegatee,
              })}
            </p>
          ) : null}
        </div>
        {hiveDelegationMinHp != null ? (
          <p className="mt-2 text-body-sm text-muted">
            {interpolateMessage(t('wallet_hive_delegation_min_hp'), {
              minHp: formatHiveAmount(hiveDelegationMinHp),
            })}
          </p>
        ) : null}
        <div className="mt-4 space-y-2 text-body-sm text-muted">
          {balanceConfig ? (
            <p>
              {interpolateMessage(t('wallet_delegate_timing'), {
                symbol: balanceConfig.balanceSymbol,
                days: String(balanceConfig.returnDays),
              })}
            </p>
          ) : null}
          <p>{t('wallet_broadcast_approval_note')}</p>
        </div>
        {validationError ? (
          <p className="mt-3 text-body-sm text-error" role="alert">
            {validationError}
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 text-body-sm text-error" role="alert">
            {t(engineTokenBroadcastErrorMessageKey(error))}
          </p>
        ) : null}
        <button
          type="button"
          className="mt-6 w-full rounded-btn bg-accent px-4 py-2 text-body font-weight-label text-accent-fg disabled:opacity-50"
          disabled={pending || !canSubmit}
          onClick={() => void onSubmit()}
        >
          {pending ? '…' : t('delegate')}
        </button>
      </div>
    </AppModal>
  );
}
