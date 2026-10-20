'use client';

import Link from 'next/link';

import { useI18n } from '@/i18n/providers/i18n-provider';
import type { ActivityRowView } from '@/modules/user-activity/domain/types/activity-row-view';
import { interpolateMessage } from '@/modules/user-activity/presentation/utils/interpolate-message';
import { UserAvatar } from '@/shared/presentation';

import {
  WalletAmount,
  WalletDualAmount,
  WalletHistoryRowShell,
} from './wallet-history-row-shell';
import {
  ArrowLeftRightIcon,
  CheckCircleIcon,
  CloseIcon,
  WalletPowerLightningIcon,
  WalletSavingsShieldIcon,
} from '@/icons';

type ProfileLinkProps = { name: string; children: React.ReactNode };

function ProfileLink({ name, children }: ProfileLinkProps) {
  return (
    <Link href={`/@${name}`} className="text-link" suppressHydrationWarning>
      {children}
    </Link>
  );
}

function isWalletKind(row: ActivityRowView): boolean {
  return row.kind.startsWith('wallet_');
}

function savingsLabel(
  t: (key: string) => string,
  operationType: string,
  requestId?: string,
): string {
  const messageKey = savingsMessageKey(operationType);
  if (!messageKey) {
    return operationType;
  }
  if (
    requestId &&
    (operationType === 'cancel_transfer_from_savings' ||
      operationType === 'transfer_from_savings')
  ) {
    return interpolateMessage(t(messageKey), { requestId });
  }
  return t(messageKey);
}

export function WalletHistoryRow({ row, accountName }: { row: ActivityRowView; accountName: string }) {
  const { t } = useI18n();
  const profile = accountName.trim().toLowerCase();

  if (!isWalletKind(row)) {
    return null;
  }

  switch (row.kind) {
    case 'wallet_transfer': {
      const amountLabel = `${row.amount} ${row.currency}`.trim();
      const amountTone =
        row.direction === 'in'
          ? 'positive'
          : row.direction === 'self'
            ? 'neutral'
            : 'negative';
      return (
        <WalletHistoryRowShell
          timestamp={row.timestamp}
          avatar={
            row.direction !== 'self' ? (
              <UserAvatar username={row.counterparty} size={40} />
            ) : undefined
          }
          amount={<WalletAmount value={amountLabel} tone={amountTone} />}
          secondary={
            row.memo ? (
              <p className="min-w-0 break-all text-caption text-muted">{row.memo}</p>
            ) : undefined
          }
        >
          {row.direction === 'in' || row.direction === 'self' ? (
            <>
              {t('activity_received')} {t('activity_from')}{' '}
              <ProfileLink name={row.counterparty}>@{row.counterparty}</ProfileLink>
            </>
          ) : (
            <>
              {t('activity_transferred')} {t('activity_to')}{' '}
              <ProfileLink name={row.counterparty}>@{row.counterparty}</ProfileLink>
            </>
          )}
        </WalletHistoryRowShell>
      );
    }
    case 'wallet_power_up': {
      const amountLabel = `${row.amount} ${row.currency}`.trim();
      const amountTone = row.direction === 'in' ? 'positive' : 'negative';
      return (
        <WalletHistoryRowShell
          timestamp={row.timestamp}
          icon={<WalletPowerLightningIcon />}
          amount={<WalletAmount value={amountLabel} tone={amountTone} />}
        >
          {t('power_up')}{' '}
          {row.direction === 'in' ? t('activity_from') : t('activity_to')}{' '}
          <ProfileLink name={row.counterparty}>@{row.counterparty}</ProfileLink>
        </WalletHistoryRowShell>
      );
    }
    case 'wallet_savings': {
      const amountLabel = `${row.amount} ${row.currency}`.trim();
      const isInterest = row.operationType === 'interest';
      const amountTone = isInterest ? 'positive' : 'neutral';
      return (
        <WalletHistoryRowShell
          timestamp={row.timestamp}
          icon={<WalletSavingsShieldIcon />}
          amount={
            amountLabel ? (
              <WalletAmount value={amountLabel} tone={amountTone} />
            ) : undefined
          }
        >
          {savingsLabel(t, row.operationType, row.requestId)}
        </WalletHistoryRowShell>
      );
    }
    case 'wallet_claim_rewards': {
      const parts = [row.hive, row.hbd, row.hp].filter(Boolean);
      return (
        <WalletHistoryRowShell
          timestamp={row.timestamp}
          icon={<CheckCircleIcon size={22} />}
          amount={
            parts.length > 0 ? (
              <WalletAmount value={parts.join(', ')} tone="positive" />
            ) : undefined
          }
        >
          {t('claim_rewards')}
        </WalletHistoryRowShell>
      );
    }
    case 'wallet_delegate': {
      const isReceiver = row.delegator.toLowerCase() !== profile;
      const counterparty = isReceiver ? row.delegator : row.delegatee;
      const labelKey = row.isUndelegation
        ? isReceiver
          ? 'undelegated_from'
          : 'undelegated_to'
        : isReceiver
          ? 'delegation_from'
          : 'delegated_to';
      return (
        <WalletHistoryRowShell
          timestamp={row.timestamp}
          icon={<span className="text-body-lg" aria-hidden>→</span>}
          amount={
            row.hpAmount > 0 ? (
              <span className="text-fg">{row.hpAmount.toFixed(3)} HP</span>
            ) : undefined
          }
        >
          {t(labelKey)}{' '}
          <ProfileLink name={counterparty}>@{counterparty}</ProfileLink>
        </WalletHistoryRowShell>
      );
    }
    case 'wallet_power_down': {
      if (row.subtype === 'route') {
        const routeCanceled = (row.percent ?? 0) === 0;
        const routeKey = routeCanceled
          ? row.direction === 'in'
            ? 'withdraw_vesting_route_is_canceled_from'
            : 'withdraw_vesting_route_is_canceled_to'
          : 'withdraw_vesting_route_is_set';
        return (
          <WalletHistoryRowShell
            timestamp={row.timestamp}
            avatar={
              row.counterparty ? (
                <UserAvatar username={row.counterparty} size={40} />
              ) : undefined
            }
            amount={
              !routeCanceled && row.percent !== undefined ? (
                <span className="text-fg">{row.percent}%</span>
              ) : undefined
            }
          >
            {interpolateMessage(t(routeKey), {
              from_account: row.from ?? '',
              to_account: row.to ?? '',
            })}{' '}
            {row.counterparty ? (
              <ProfileLink name={row.counterparty}>@{row.counterparty}</ProfileLink>
            ) : null}
          </WalletHistoryRowShell>
        );
      }
      if (row.subtype === 'start') {
        return (
          <WalletHistoryRowShell
            timestamp={row.timestamp}
            icon={<WalletPowerLightningIcon />}
            amount={
              row.hpAmount ? (
                <WalletAmount value={row.hpAmount} tone="neutral" />
              ) : undefined
            }
          >
            {t('power_down_started')}
          </WalletHistoryRowShell>
        );
      }
      if (row.subtype === 'stop') {
        return (
          <WalletHistoryRowShell
            timestamp={row.timestamp}
            icon={<WalletPowerLightningIcon />}
          >
            {t('activity_power_down_stop')}
          </WalletHistoryRowShell>
        );
      }
      const amountTone =
        row.direction === 'in' ? 'positive' : row.direction === 'out' ? 'negative' : 'neutral';
      return (
        <WalletHistoryRowShell
          timestamp={row.timestamp}
          icon={<WalletPowerLightningIcon />}
          amount={
            row.hpAmount ? (
              <WalletAmount value={row.hpAmount} tone={amountTone} />
            ) : undefined
          }
        >
          {row.counterparty ? (
            <>
              {t('power_down_withdraw')}{' '}
              {row.direction === 'in' ? t('activity_from') : t('activity_to')}{' '}
              <ProfileLink name={row.counterparty}>@{row.counterparty}</ProfileLink>
            </>
          ) : (
            t('power_down_withdraw')
          )}
        </WalletHistoryRowShell>
      );
    }
    case 'wallet_convert': {
      const labelKey = convertLabelKey(row.subtype);
      const isRequest =
        row.subtype === 'hbd_request' || row.subtype === 'hive_request';
      const amountLabel = row.amountIn;
      return (
        <WalletHistoryRowShell
          timestamp={row.timestamp}
          icon={<ArrowLeftRightIcon size={20} />}
          amount={
            amountLabel ? (
              <WalletAmount value={amountLabel} tone={isRequest ? 'negative' : 'positive'} />
            ) : undefined
          }
        >
          {t(labelKey)}
        </WalletHistoryRowShell>
      );
    }
    case 'wallet_fill_order':
      return (
        <WalletHistoryRowShell
          timestamp={row.timestamp}
          avatar={<UserAvatar username={row.exchanger} size={40} />}
          amount={
            <WalletDualAmount
              transfer={row.transferAmount}
              received={row.receivedAmount}
            />
          }
        >
          {row.isSeller ? (
            <>
              {interpolateMessage(t('fillOrder_wallet_transferred'), {
                current_pays: row.transferAmount,
                exchanger: '',
              }).trimEnd()}{' '}
              <ProfileLink name={row.exchanger}>@{row.exchanger}</ProfileLink>
            </>
          ) : (
            <>
              {interpolateMessage(t('fillOrder_wallet_get'), {
                open_pays: row.openPays,
                exchanger: '',
              }).trimEnd()}{' '}
              <ProfileLink name={row.exchanger}>@{row.exchanger}</ProfileLink>
            </>
          )}
        </WalletHistoryRowShell>
      );
    case 'wallet_limit_order':
      return (
        <WalletHistoryRowShell
          timestamp={row.timestamp}
          icon={<ArrowLeftRightIcon size={20} />}
          amount={
            <span className="text-fg">
              {row.amountToSell} → {row.minToReceive}
            </span>
          }
        >
          {t('limit_order')}
        </WalletHistoryRowShell>
      );
    case 'wallet_cancel_order':
      return (
        <WalletHistoryRowShell
          timestamp={row.timestamp}
          icon={<CloseIcon size={20} />}
          amount={
            row.currentPays ? (
              <span className="text-fg">{row.currentPays}</span>
            ) : undefined
          }
        >
          {row.openPays
            ? interpolateMessage(t('cancel_order'), { open_pays: row.openPays })
            : t('cancel_limit_order')}
        </WalletHistoryRowShell>
      );
    case 'wallet_proposal_pay': {
      const labelKey =
        row.direction === 'in' ? 'proposal_payment_from' : 'proposal_payment_to';
      return (
        <WalletHistoryRowShell
          timestamp={row.timestamp}
          icon={<CheckCircleIcon size={22} />}
          amount={
            row.amount ? (
              <WalletAmount
                value={row.amount}
                tone={row.direction === 'in' ? 'positive' : 'negative'}
              />
            ) : undefined
          }
        >
          {interpolateMessage(t(labelKey), {
            steem_dao: row.payer,
            receiver: row.receiver,
          })}
        </WalletHistoryRowShell>
      );
    }
    default:
      return null;
  }
}

function savingsMessageKey(operationType: string): string | null {
  switch (operationType) {
    case 'transfer_to_savings':
      return 'deposit_to_savings';
    case 'transfer_from_savings':
      return 'withdraw_from_savings';
    case 'cancel_transfer_from_savings':
      return 'cancel_transfer_from_savings';
    case 'fill_transfer_from_savings':
      return 'transfer_from_savings_op_title';
    case 'transfer_to_vesting_completed':
      return 'power_up';
    case 'interest':
      return 'wallet_interest_title';
    default:
      return null;
  }
}

function convertLabelKey(
  subtype: 'hbd_request' | 'hbd_completed' | 'hive_request' | 'hive_completed',
): string {
  switch (subtype) {
    case 'hbd_request':
      return 'wallet_hbd_hive_conversion_request';
    case 'hbd_completed':
      return 'wallet_hbd_hive_conversion_completed';
    case 'hive_request':
      return 'wallet_hive_hbd_conversion_request';
    case 'hive_completed':
      return 'wallet_hive_hbd_conversion_completed';
  }
}
