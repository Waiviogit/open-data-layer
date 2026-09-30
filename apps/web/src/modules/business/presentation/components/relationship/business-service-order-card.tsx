'use client';

import Link from 'next/link';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { ActivityTimestamp } from '@/modules/user-activity/presentation/components/activity-timestamp';

import type { LedgerServiceOrderRow } from '../../../domain/ledger.types';
import { businessRoutes } from '../../../domain/routes';
import { canCancelServiceOrder, serviceOrderStatus } from '../../../domain/service-order-cancel';
import { StateBadge } from '../state-badge';

export function BusinessServiceOrderCard({
  so,
  username,
  linkedContract,
  linkedContractUrl,
  isBusy,
  onCancel,
}: {
  so: LedgerServiceOrderRow;
  username: string;
  linkedContract: string | null;
  linkedContractUrl: string | null;
  isBusy: boolean;
  onCancel: (serviceOrderId: string) => void;
}) {
  const { t } = useI18n();
  const cancelled = serviceOrderStatus(so) === 'cancelled';
  const showCancel = canCancelServiceOrder(so, username);

  return (
    <article className="rounded-card border border-border bg-surface/80 p-card-padding text-body-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Link
          href={businessRoutes.serviceOrder(so.service_order_id)}
          className="font-weight-label text-heading hover:underline"
          suppressHydrationWarning
        >
          {so.service_order_id}
        </Link>
        {cancelled ? <StateBadge variant="cancelled" /> : null}
      </div>
      {linkedContract ? (
        <p className="mt-2 text-caption text-fg-secondary">
          {t('business_field_contract')}:{' '}
          {linkedContractUrl ? (
            <Link href={linkedContractUrl} className="text-link">
              {linkedContract}
            </Link>
          ) : (
            linkedContract
          )}
        </p>
      ) : null}
      <p className="mt-1 text-caption text-fg-secondary">
        {t('business_field_created_at')}:{' '}
        <ActivityTimestamp timestamp={so.created_at} />
      </p>
      {showCancel ? (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onCancel(so.service_order_id)}
          className="mt-3 rounded-btn border border-border px-3 py-1 text-body-sm disabled:opacity-50"
        >
          {t('business_cancel_service_order')}
        </button>
      ) : null}
    </article>
  );
}
