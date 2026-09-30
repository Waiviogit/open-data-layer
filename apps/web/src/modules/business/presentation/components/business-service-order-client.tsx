'use client';

import Link from 'next/link';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { useOblCustomJsonId } from '@/config/odl-network-provider';
import { formatAbsoluteDateTime } from '@/shared/utils/format-relative-time';

import { buildCancelServiceOrderOp } from '../../application/build-obl-ops';
import { shortContractId } from '../../domain/dispute-resolution';
import { businessRoutes } from '../../domain/routes';
import { canCancelServiceOrder, serviceOrderStatus } from '../../domain/service-order-cancel';
import type { OblServiceOrderDetailApiResponse } from '../../infrastructure/clients/obl-ledger.server';
import { useOblBroadcast } from '../hooks/use-obl-broadcast';
import { BusinessPageShell } from '../layout/business-page-shell';
import { StateBadge } from './state-badge';

export function BusinessServiceOrderClient({
  username,
  detail,
}: {
  username: string;
  detail: OblServiceOrderDetailApiResponse;
}) {
  const { t, locale } = useI18n();
  const { serviceOrder, contract } = detail;
  const counterparty =
    username === serviceOrder.provider ? serviceOrder.client : serviceOrder.provider;
  const oblCustomJsonId = useOblCustomJsonId();
  const { broadcast, isBusy, phase, error } = useOblBroadcast(username, counterparty);
  const cancelled = serviceOrderStatus(serviceOrder) === 'cancelled';
  const showCancel = canCancelServiceOrder(serviceOrder, username);

  async function onCancel() {
    await broadcast(
      [
        buildCancelServiceOrderOp({
          oblCustomJsonId,
          serviceOrderId: serviceOrder.service_order_id,
          username,
        }),
      ],
      { serviceOrderId: serviceOrder.service_order_id },
    );
  }

  return (
    <BusinessPageShell
      activeNav="relationships"
      title={serviceOrder.service_order_id}
      subtitle={t('business_service_order_subtitle')}
      actions={
        showCancel ? (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void onCancel()}
            className="rounded-btn border border-border px-3 py-1 text-body-sm disabled:opacity-50"
          >
            {t('business_cancel_service_order')}
          </button>
        ) : null
      }
    >
      <dl className="grid gap-3 text-body-sm">
        {cancelled ? (
          <div className="flex flex-wrap items-center gap-2">
            <StateBadge variant="cancelled" />
          </div>
        ) : null}
        <div>
          <dt className="text-fg-secondary">{t('business_field_creator')}</dt>
          <dd>@{serviceOrder.creator}</dd>
        </div>
        <div>
          <dt className="text-fg-secondary">{t('business_field_provider')}</dt>
          <dd>@{serviceOrder.provider}</dd>
        </div>
        <div>
          <dt className="text-fg-secondary">{t('business_field_client')}</dt>
          <dd>@{serviceOrder.client}</dd>
        </div>
        {cancelled && serviceOrder.cancelled_by ? (
          <div>
            <dt className="text-fg-secondary">{t('business_field_cancelled_by')}</dt>
            <dd>@{serviceOrder.cancelled_by}</dd>
          </div>
        ) : null}
        {cancelled && serviceOrder.cancelled_at ? (
          <div>
            <dt className="text-fg-secondary">{t('business_field_cancelled_at')}</dt>
            <dd>
              <time dateTime={serviceOrder.cancelled_at}>
                {formatAbsoluteDateTime(serviceOrder.cancelled_at, locale)}
              </time>
            </dd>
          </div>
        ) : null}
        {contract ? (
          <div>
            <dt className="text-fg-secondary">{t('business_field_contract')}</dt>
            <dd>
              <Link href={businessRoutes.contract(contract.contract_id)} className="text-link">
                {contract.offer_name ?? contract.contract_id} ·{' '}
                {shortContractId(contract.contract_id)}
              </Link>
            </dd>
          </div>
        ) : (
          <div>
            <dt className="text-fg-secondary">{t('business_field_contract')}</dt>
            <dd className="font-mono text-caption">{serviceOrder.contract_id}</dd>
          </div>
        )}
        <div>
          <dt className="text-fg-secondary">{t('business_field_created_at')}</dt>
          <dd>
            <time dateTime={serviceOrder.created_at}>
              {formatAbsoluteDateTime(serviceOrder.created_at, locale)}
            </time>
          </dd>
        </div>
        {Object.keys(serviceOrder.details ?? {}).length > 0 ? (
          <div>
            <dt className="text-fg-secondary">{t('business_sign_metadata_label')}</dt>
            <dd>
              <pre className="mt-1 whitespace-pre-wrap rounded-btn border border-border bg-surface-alt p-2 font-mono text-caption">
                {JSON.stringify(serviceOrder.details, null, 2)}
              </pre>
            </dd>
          </div>
        ) : null}
      </dl>
      {phase === 'indexing' ? <StateBadge variant="indexing" /> : null}
      {error ? <p className="text-body-sm text-error">{error}</p> : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={businessRoutes.relationship(serviceOrder.provider)}
          className="text-body-sm text-link"
        >
          @{serviceOrder.provider}
        </Link>
        <Link
          href={businessRoutes.relationship(serviceOrder.client)}
          className="text-body-sm text-link"
        >
          @{serviceOrder.client}
        </Link>
      </div>
    </BusinessPageShell>
  );
}
