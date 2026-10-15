'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState, useTransition } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { useOblCustomJsonId } from '@/config/odl-network-provider';
import { ActivityTimestamp } from '@/modules/user-activity/presentation/components/activity-timestamp';
import { OptimisticNavLink, useInfiniteScroll, useSyncedPaginatedList } from '@/shared/presentation';

import { buildResolveDisputeOp } from '../../application/build-obl-ops';
import {
  buildArbitrationHref,
  type ArbitrationStatus,
} from '../../domain/arbitration-status-url';
import type { DisputeAuthority } from '../../domain/dispute-resolution';
import type {
  LedgerContractRow,
  LedgerDisputeRow,
} from '../../domain/ledger.types';
import { businessRoutes } from '../../domain/routes';
import type { OblCursorPage } from '../../domain/obl-pagination.types';
import { loadMoreOblArbitrationAction } from '../../infrastructure/actions/load-more-obl.server';
import type { ArbitrationDisputeApiRow } from '../../infrastructure/clients/obl-arbitration.server';
import { useOblBroadcast } from '../hooks/use-obl-broadcast';
import {
  BusinessEmptyState,
  BusinessPageShell,
} from '../layout/business-page-shell';
import { BusinessResolveDisputeModal } from './relationship/business-resolve-dispute-modal';
import { DisputeSettlementSummary } from './relationship/dispute-settlement-summary';

function toLedgerContract(row: ArbitrationDisputeApiRow): LedgerContractRow {
  return {
    contract_id: row.contract.contract_id,
    offer_id: row.contract.offer_id,
    offer_version: row.contract.offer_version,
    provider: row.contract.provider,
    client: row.contract.client,
    dispute_rule: row.contract.dispute_rule,
    arbiter: row.contract.arbiter,
    offer_name: row.offerName,
    offer_description: row.contract.offer_description ?? null,
    service_order_schema: row.contract.service_order_schema ?? null,
    created_at: row.contract.created_at,
  };
}

export function BusinessArbitrationClient({
  username,
  status,
  initialPage,
}: {
  username: string;
  status: ArbitrationStatus;
  initialPage: OblCursorPage<ArbitrationDisputeApiRow>;
}) {
  const { t } = useI18n();
  const oblCustomJsonId = useOblCustomJsonId();
  const [pending, startTransition] = useTransition();
  const [resolveRow, setResolveRow] = useState<ArbitrationDisputeApiRow | null>(null);
  const { items, setItems, hasMore, setHasMore, cursor, setCursor } =
    useSyncedPaginatedList({
      items: initialPage.items,
      hasMore: initialPage.hasMore,
      cursor: initialPage.nextCursor,
    });
  const { broadcast, isBusy } = useOblBroadcast(username);

  const onLoadMore = useCallback(() => {
    if (!hasMore || pending || !cursor) {
      return;
    }
    startTransition(async () => {
      const next = await loadMoreOblArbitrationAction(username, status, cursor);
      setItems((prev) => [...prev, ...next.items]);
      setHasMore(next.hasMore);
      setCursor(next.nextCursor);
    });
  }, [cursor, hasMore, pending, setCursor, setHasMore, setItems, status, username]);

  const { sentinelRef } = useInfiniteScroll({
    hasMore,
    isLoading: pending,
    onLoadMore,
  });

  const resolveDispute = useMemo(() => resolveRow?.dispute ?? null, [resolveRow]);
  const resolveInvoice = useMemo(() => resolveRow?.invoice ?? null, [resolveRow]);
  const resolveAuthority = useMemo((): DisputeAuthority | null => {
    if (!resolveRow) {
      return null;
    }
    return {
      rule: 'arbiter',
      resolverAccount: username,
      provider: resolveRow.pair.provider,
      client: resolveRow.pair.client,
      arbiter: resolveRow.contract.arbiter,
    };
  }, [resolveRow, username]);

  async function submitResolve(dispute: LedgerDisputeRow, finalAmountUsd: string) {
    if (!resolveRow) {
      return;
    }
    await broadcast(
      [
        buildResolveDisputeOp({
          oblCustomJsonId,
          disputeId: dispute.dispute_id,
          resolver: username,
          finalAmountUsd,
        }),
      ],
      {
        refreshArbitration: true,
        ledgerPairs: [
          {
            accountA: resolveRow.pair.provider,
            accountB: resolveRow.pair.client,
          },
        ],
      },
    );
  }

  const filterTabs: Array<{ status: ArbitrationStatus; labelKey: string }> = [
    { status: 'open', labelKey: 'business_arbitration_filter_open' },
    { status: 'resolved', labelKey: 'business_arbitration_filter_resolved' },
  ];

  return (
    <>
      <BusinessPageShell
        activeNav="arbitration"
        title={t('business_arbitration_title')}
        subtitle={t('business_arbitration_subtitle')}
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {filterTabs.map((tab) => {
            const isActive = tab.status === status;
            return (
              <OptimisticNavLink
                key={tab.status}
                href={buildArbitrationHref(tab.status)}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'rounded-btn px-3 py-1.5 text-body-sm',
                  isActive
                    ? 'bg-surface-alt font-weight-label text-heading'
                    : 'border border-border text-fg-secondary hover:bg-ghost-surface',
                ].join(' ')}
              >
                {t(tab.labelKey)}
              </OptimisticNavLink>
            );
          })}
        </div>

        {items.length === 0 ? (
          <BusinessEmptyState
            title={t('business_arbitration_empty_title')}
            description={t('business_arbitration_empty_body')}
          />
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {items.map((row) => {
                const contract = toLedgerContract(row);
                const isOpen = row.dispute.status === 'open';
                return (
                  <li
                    key={row.dispute.dispute_id}
                    className="rounded-card border border-border bg-surface p-card-padding shadow-card"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-body font-weight-strong text-heading">
                          @{row.pair.provider} ↔ @{row.pair.client}
                        </p>
                        <p className="text-caption text-fg-secondary">
                          {row.offerName} ·{' '}
                          <ActivityTimestamp timestamp={row.dispute.created_at} />
                        </p>
                        <DisputeSettlementSummary
                          dispute={row.dispute}
                          invoice={row.invoice}
                        />
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <Link
                          href={businessRoutes.relationshipTab(row.pair.provider, 'disputes')}
                          className="text-body-sm text-link"
                        >
                          {t('business_arbitration_view_relationship')}
                        </Link>
                        {isOpen ? (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => setResolveRow(row)}
                            className="rounded-btn bg-accent px-3 py-1 text-body-sm text-accent-fg disabled:opacity-50"
                          >
                            {t('business_dispute_resolve_action')}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-2 text-caption text-fg-tertiary">
                      {contract.contract_id}
                    </p>
                  </li>
                );
              })}
            </ul>
            <div ref={sentinelRef} className="h-4" aria-hidden />
          </>
        )}
      </BusinessPageShell>

      <BusinessResolveDisputeModal
        open={resolveRow !== null}
        dispute={resolveDispute}
        invoice={resolveInvoice}
        authority={resolveAuthority}
        onClose={() => setResolveRow(null)}
        isBusy={isBusy}
        onSubmit={submitResolve}
      />
    </>
  );
}
