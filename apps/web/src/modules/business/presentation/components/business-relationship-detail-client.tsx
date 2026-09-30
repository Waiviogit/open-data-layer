'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { useOblCustomJsonId } from '@/config/odl-network-provider';
import { ActivityTimestamp } from '@/modules/user-activity/presentation/components/activity-timestamp';
import { OptimisticTabButton } from '@/shared/presentation';

import {
  buildConfirmPaymentOp,
  buildCreateReportOp,
  buildCreateServiceOrderOp,
  buildCancelServiceOrderOp,
  buildDeclarePaymentOp,
  buildIssueInvoiceOp,
  buildIssueSplitInvoiceOp,
  buildOpenDisputeOp,
  buildResolveDisputeOp,
} from '../../application/build-obl-ops';
import {
  canViewerResolveDispute,
  disputeAuthorityForInvoice,
  findInvoiceForDispute,
  formatUsdDisplay,
  shortContractId,
  truncateText,
} from '../../domain/dispute-resolution';
import type {
  LedgerContractRow,
  LedgerDisputeRow,
  LedgerInvoiceRow,
  LedgerPaymentRow,
  LedgerReportRow,
  LedgerServiceOrderRow,
  PairBalanceView,
} from '../../domain/ledger.types';
import { groupLedgerInvoiceRows, type InvoiceIssueSubmitPayload } from '../../domain/invoice-issue';
import { sortByCreatedAtDesc } from '../../domain/ledger-sort';
import {
  newOblDisputeId,
  newOblInvoiceId,
  newOblPaymentConfirmId,
  newOblPaymentDeclareId,
  newOblReportId,
  newOblServiceOrderId,
} from '../../domain/obl-ids';
import { businessRoutes } from '../../domain/routes';
import { canCreateServiceOrderOnContract } from '../../domain/service-order-create';
import {
  buildRelationshipTabHref,
  parseRelationshipTab,
  type RelationshipTab,
} from '../../domain/relationship-tab-url';
import type { OblCursorPage } from '../../domain/obl-pagination.types';
import type { OblContractApiRow } from '../../infrastructure/clients/obl-ledger.server';
import { BalanceCards } from './balance-cards';
import { BusinessCreateReportModal } from './relationship/business-create-report-modal';
import { BusinessCreateServiceOrderModal } from './relationship/business-create-service-order-modal';
import { BusinessConfirmPaymentModal } from './relationship/business-confirm-payment-modal';
import { BusinessDeclarePaymentModal } from './relationship/business-declare-payment-modal';
import { BusinessIssueInvoiceModal } from './relationship/business-issue-invoice-modal';
import { BusinessServiceOrderCard } from './relationship/business-service-order-card';
import { BusinessOpenDisputeModal } from './relationship/business-open-dispute-modal';
import { BusinessResolveDisputeModal } from './relationship/business-resolve-dispute-modal';
import { DisputeSettlementSummary } from './relationship/dispute-settlement-summary';
import { RelationshipPaymentRow } from './relationship/relationship-payment-row';
import { StateBadge } from './state-badge';
import { useOblBroadcast } from '../hooks/use-obl-broadcast';
import { useOblLedgerTabLists } from '../hooks/use-obl-ledger-tab-lists';
import { BusinessPageShell } from '../layout/business-page-shell';

type TabId = RelationshipTab;

const CONTRACT_DESCRIPTION_MAX = 300;

function invoiceDetailSummary(details: Record<string, unknown> | undefined): string | null {
  if (!details || Object.keys(details).length === 0) {
    return null;
  }
  const report = details.report;
  if (typeof report === 'string' && report.trim().length > 0) {
    return report.trim();
  }
  const memo = details.memo;
  if (typeof memo === 'string' && memo.trim().length > 0) {
    return memo.trim();
  }
  return JSON.stringify(details);
}

function invoiceStateBadgeVariant(
  state: LedgerInvoiceRow['state'],
): 'confirmed' | 'pending_signature' | 'disputed' | 'resolved' {
  if (state === 'pending') {
    return 'pending_signature';
  }
  if (state === 'disputed') {
    return 'disputed';
  }
  if (state === 'resolved') {
    return 'resolved';
  }
  return 'confirmed';
}

function castTabRows<T>(items: unknown[]): T[] {
  return items as T[];
}

function hasOpenDisputeForInvoice(
  disputes: readonly LedgerDisputeRow[],
  invoiceId: string,
): boolean {
  return disputes.some((d) => d.invoice_id === invoiceId && d.status === 'open');
}

function canDisputeInvoice(
  invoice: LedgerInvoiceRow,
  username: string,
  disputes: readonly LedgerDisputeRow[],
): boolean {
  if (invoice.state !== 'confirmed' && invoice.state !== 'pending') {
    return false;
  }
  if (username !== invoice.debtor && username !== invoice.creditor) {
    const beneficiary = invoice.beneficiary ?? invoice.creditor;
    if (username !== beneficiary) {
      return false;
    }
  }
  return !hasOpenDisputeForInvoice(disputes, invoice.invoice_id);
}

function contractLabel(
  contractId: string | null | undefined,
  contracts: readonly LedgerContractRow[],
): string | null {
  if (!contractId) {
    return null;
  }
  const contract = contracts.find((c) => c.contract_id === contractId);
  if (!contract) {
    return contractId;
  }
  return `${contract.offer_name} · ${shortContractId(contract.contract_id)}`;
}

function contractHref(contractId: string | null | undefined): string | null {
  if (!contractId) {
    return null;
  }
  return businessRoutes.contract(contractId);
}

export function BusinessRelationshipDetailClient({
  username,
  counterparty,
  balance,
  initialTab,
  initialTabPages,
  contractLabels,
}: {
  username: string;
  counterparty: string;
  balance: PairBalanceView;
  initialTab: RelationshipTab;
  initialTabPages: Partial<Record<RelationshipTab, OblCursorPage<unknown>>>;
  contractLabels: OblContractApiRow[];
}) {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const oblCustomJsonId = useOblCustomJsonId();
  const { broadcast, isBusy, phase, error } = useOblBroadcast(username, counterparty);
  const [tab, setTab] = useState<RelationshipTab>(initialTab);
  useEffect(() => {
    setTab(parseRelationshipTab(searchParams));
  }, [searchParams]);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [serviceOrderModalOpen, setServiceOrderModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [declareModalOpen, setDeclareModalOpen] = useState(false);
  const [confirmPaymentRow, setConfirmPaymentRow] = useState<LedgerPaymentRow | null>(null);
  const [disputeInvoice, setDisputeInvoice] = useState<LedgerInvoiceRow | null>(null);
  const [resolveDisputeRow, setResolveDisputeRow] = useState<LedgerDisputeRow | null>(null);

  const { lists, sentinelRef } = useOblLedgerTabLists({
    accountA: username,
    accountB: counterparty,
    activeTab: tab,
    initialPages: initialTabPages,
  });

  const contracts = useMemo(() => {
    const fromTab = sortByCreatedAtDesc(
      castTabRows<LedgerContractRow>(lists.contracts.items),
    );
    if (fromTab.length > 0) {
      return fromTab;
    }
    return sortByCreatedAtDesc(contractLabels as LedgerContractRow[]);
  }, [contractLabels, lists.contracts.items]);

  const serviceOrderContracts = useMemo(
    () => contracts.filter(canCreateServiceOrderOnContract),
    [contracts],
  );

  const invoices = useMemo(
    () =>
      groupLedgerInvoiceRows(
        sortByCreatedAtDesc(castTabRows<LedgerInvoiceRow>(lists.invoices.items)),
      ),
    [lists.invoices.items],
  );
  const payments = useMemo(
    () => sortByCreatedAtDesc(castTabRows<LedgerPaymentRow>(lists.payments.items)),
    [lists.payments.items],
  );
  const disputes = useMemo(
    () => sortByCreatedAtDesc(castTabRows<LedgerDisputeRow>(lists.disputes.items)),
    [lists.disputes.items],
  );
  const serviceOrders = useMemo(
    () =>
      sortByCreatedAtDesc(castTabRows<LedgerServiceOrderRow>(lists['service-orders'].items)),
    [lists['service-orders'].items],
  );
  const reports = useMemo(
    () => sortByCreatedAtDesc(castTabRows<LedgerReportRow>(lists.reports.items)),
    [lists.reports.items],
  );

  const resolveAuthority = useMemo(() => {
    if (!resolveDisputeRow) {
      return null;
    }
    const invoice = findInvoiceForDispute(resolveDisputeRow, invoices);
    if (!invoice) {
      return null;
    }
    const governingContract = invoice.contract_id
      ? contracts.find((c) => c.contract_id === invoice.contract_id)
      : undefined;
    return disputeAuthorityForInvoice(invoice, contracts, governingContract);
  }, [resolveDisputeRow, invoices, contracts]);

  const resolveInvoice = useMemo(() => {
    if (!resolveDisputeRow) {
      return null;
    }
    return findInvoiceForDispute(resolveDisputeRow, invoices) ?? null;
  }, [resolveDisputeRow, invoices]);

  async function issueInvoice(payload: InvoiceIssueSubmitPayload) {
    const invoiceId = newOblInvoiceId();
    const revalidateOverride = {
      invoiceId,
      contractId: payload.contractId,
      serviceOrderId: payload.serviceOrderId,
      reportId: payload.reportId,
    };
    if (payload.mode === 'simple') {
      await broadcast(
        [
          buildIssueInvoiceOp({
            oblCustomJsonId,
            invoiceId,
            issuer: username,
            debtor: payload.parties.debtor,
            creditor: payload.parties.creditor,
            amountUsd: payload.amountUsd,
            contractId: payload.contractId,
            serviceOrderId: payload.serviceOrderId,
            reportId: payload.reportId,
            details: payload.details,
          }),
        ],
        revalidateOverride,
      );
      return;
    }
    await broadcast(
      [
        buildIssueSplitInvoiceOp({
          oblCustomJsonId,
          invoiceId,
          issuer: username,
          debtor: payload.debtor,
          beneficiaries: payload.beneficiaries,
          contractId: payload.contractId,
          serviceOrderId: payload.serviceOrderId,
          reportId: payload.reportId,
          details: payload.details,
        }),
      ],
      revalidateOverride,
    );
  }

  async function createServiceOrder(input: {
    contractId: string;
    details?: Record<string, unknown>;
  }) {
    const serviceOrderId = newOblServiceOrderId();
    await broadcast(
      [
        buildCreateServiceOrderOp({
          oblCustomJsonId,
          serviceOrderId,
          contractId: input.contractId,
          creator: username,
          details: input.details,
        }),
      ],
      { serviceOrderId, contractId: input.contractId },
    );
  }

  async function cancelServiceOrder(serviceOrderId: string) {
    await broadcast(
      [
        buildCancelServiceOrderOp({
          oblCustomJsonId,
          serviceOrderId,
          username,
        }),
      ],
      { serviceOrderId },
    );
  }

  async function createReport(input: {
    contractId?: string;
    serviceOrderId?: string;
    details?: Record<string, unknown>;
  }) {
    const reportId = newOblReportId();
    await broadcast(
      [
        buildCreateReportOp({
          oblCustomJsonId,
          reportId,
          author: username,
          contractId: input.contractId,
          serviceOrderId: input.serviceOrderId,
          details: input.details,
        }),
      ],
      {
        reportId,
        contractId: input.contractId,
        serviceOrderId: input.serviceOrderId,
      },
    );
  }

  async function recordPayment(
    amountUsd: string,
    parties: { payer: string; receiver: string },
    ref?: Record<string, unknown>,
  ) {
    if (parties.receiver === username) {
      await broadcast([
        buildConfirmPaymentOp({
          oblCustomJsonId,
          paymentId: newOblPaymentConfirmId(),
          receiver: username,
          payer: parties.payer,
          amountUsd,
          ref,
        }),
      ]);
      return;
    }

    await broadcast([
      buildDeclarePaymentOp({
        oblCustomJsonId,
        paymentId: newOblPaymentDeclareId(),
        payer: parties.payer,
        receiver: parties.receiver,
        amountUsd,
        ref,
      }),
    ]);
  }

  async function submitPaymentConfirm(pay: LedgerPaymentRow, amountUsd: string) {
    await broadcast([
      buildConfirmPaymentOp({
        oblCustomJsonId,
        paymentId: newOblPaymentConfirmId(),
        receiver: username,
        payer: pay.payer,
        amountUsd,
        declarePaymentId: pay.payment_id,
      }),
    ]);
  }

  async function openDispute(invoice: LedgerInvoiceRow, proposedAmountUsd: string) {
    await broadcast([
      buildOpenDisputeOp({
        oblCustomJsonId,
        disputeId: newOblDisputeId(),
        invoiceId: invoice.invoice_id,
        disputant: username,
        proposedAmountUsd,
      }),
    ]);
  }

  async function resolveDispute(dispute: LedgerDisputeRow, finalAmountUsd: string) {
    await broadcast([
      buildResolveDisputeOp({
        oblCustomJsonId,
        disputeId: dispute.dispute_id,
        resolver: username,
        finalAmountUsd,
      }),
    ]);
  }

  const tabs: TabId[] = [
    'payments',
    'contracts',
    'service-orders',
    'reports',
    'invoices',
    'disputes',
  ];

  return (
    <>
      <BusinessPageShell
        activeNav="relationships"
        title={`@${counterparty}`}
        subtitle={t('business_relationship_detail_subtitle')}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setInvoiceModalOpen(true)}
              className="rounded-btn bg-accent px-3 py-1 text-body-sm text-accent-fg disabled:opacity-50"
            >
              {t('business_create_invoice')}
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setServiceOrderModalOpen(true)}
              className="rounded-btn border border-border px-3 py-1 text-body-sm disabled:opacity-50"
            >
              {t('business_create_service_order')}
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setReportModalOpen(true)}
              className="rounded-btn border border-border px-3 py-1 text-body-sm disabled:opacity-50"
            >
              {t('business_create_report')}
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setDeclareModalOpen(true)}
              className="rounded-btn border border-border px-3 py-1 text-body-sm disabled:opacity-50"
            >
              {t('business_record_payment')}
            </button>
          </div>
        }
      >
        <BalanceCards viewer={username} counterparty={counterparty} balance={balance} />
        {phase === 'indexing' ? (
          <div className="mt-2">
            <StateBadge variant="indexing" />
          </div>
        ) : null}
        {error ? <p className="mt-2 text-body-sm text-error">{error}</p> : null}

        <div className="mt-6 flex flex-wrap gap-2 border-b border-border pb-2">
          {tabs.map((id) => (
            <OptimisticTabButton
              key={id}
              href={buildRelationshipTabHref(counterparty, id)}
              method="replace"
              className={[
                'rounded-btn px-3 py-1 text-body-sm',
                tab === id ? 'bg-surface-alt font-weight-label text-heading' : 'text-fg-secondary',
              ].join(' ')}
            >
              {t(`business_tab_${id}`)}
            </OptimisticTabButton>
          ))}
        </div>

        <div className="mt-4">
          {tab === 'contracts' ? (
            <div className="flex flex-col gap-3">
              {contracts.length === 0 ? (
                <p className="text-body-sm text-fg-secondary">{t('business_contracts_empty')}</p>
              ) : null}
              {contracts.map((c) => (
                <Link
                  key={c.contract_id}
                  href={businessRoutes.contract(c.contract_id)}
                  className="rounded-card border border-border bg-surface/80 p-card-padding text-body-sm hover:bg-surface-alt"
                >
                  <h3 className="font-weight-label text-heading">{c.offer_name}</h3>
                  {c.offer_description ? (
                    <p className="mt-2 text-caption text-fg-secondary">
                      {truncateText(c.offer_description, CONTRACT_DESCRIPTION_MAX)}
                    </p>
                  ) : null}
                  <p className="mt-2 font-mono text-caption text-fg-secondary">{c.contract_id}</p>
                  <p className="mt-1 text-caption text-fg-secondary">
                    {t('business_field_created_at')}:{' '}
                    <ActivityTimestamp timestamp={c.created_at} />
                  </p>
                </Link>
              ))}
            </div>
          ) : null}

          {tab === 'service-orders' ? (
            <div className="flex flex-col gap-3">
              {serviceOrders.length === 0 ? (
                <p className="text-body-sm text-fg-secondary">
                  {t('business_service_orders_empty')}
                </p>
              ) : null}
              {serviceOrders.map((so) => {
                const linkedContract = contractLabel(so.contract_id, contracts);
                const linkedContractUrl = contractHref(so.contract_id);
                return (
                  <BusinessServiceOrderCard
                    key={so.service_order_id}
                    so={so}
                    username={username}
                    linkedContract={linkedContract}
                    linkedContractUrl={linkedContractUrl}
                    isBusy={isBusy}
                    onCancel={(serviceOrderId) => void cancelServiceOrder(serviceOrderId)}
                  />
                );
              })}
            </div>
          ) : null}

          {tab === 'reports' ? (
            <div className="flex flex-col gap-3">
              {reports.length === 0 ? (
                <p className="text-body-sm text-fg-secondary">{t('business_reports_empty')}</p>
              ) : null}
              {reports.map((rep) => {
                const linkedContract = contractLabel(rep.contract_id, contracts);
                const linkedContractUrl = contractHref(rep.contract_id);
                return (
                  <Link
                    key={rep.report_id}
                    href={businessRoutes.report(rep.report_id)}
                    className="rounded-card border border-border bg-surface/80 p-card-padding text-body-sm hover:bg-surface-alt"
                  >
                    <h3 className="font-weight-label text-heading">{rep.report_id}</h3>
                    <p className="mt-1 text-caption text-fg-secondary">
                      {t('business_field_author')}: @{rep.author}
                    </p>
                    {linkedContract ? (
                      <p className="mt-1 text-caption text-fg-secondary">
                        {t('business_field_contract')}:{' '}
                        {linkedContractUrl ? (
                          <span className="text-link">{linkedContract}</span>
                        ) : (
                          linkedContract
                        )}
                      </p>
                    ) : null}
                    {rep.service_order_id ? (
                      <p className="mt-1 text-caption text-fg-secondary">
                        {t('business_field_service_order')}: {rep.service_order_id}
                      </p>
                    ) : null}
                    <p className="mt-1 text-caption text-fg-secondary">
                      {t('business_field_created_at')}:{' '}
                      <ActivityTimestamp timestamp={rep.created_at} />
                    </p>
                  </Link>
                );
              })}
            </div>
          ) : null}

          {tab === 'invoices' ? (
            <div className="flex flex-col gap-3">
              {invoices.length === 0 ? (
                <p className="text-body-sm text-fg-secondary">{t('business_invoices_empty')}</p>
              ) : null}
              {invoices.map((inv) => {
                const detailSummary = invoiceDetailSummary(inv.details);
                const disputable = canDisputeInvoice(inv, username, disputes);
                const linkedContract = contractLabel(inv.contract_id, contracts);
                const linkedContractUrl = contractHref(inv.contract_id);
                const showSettled =
                  inv.state === 'resolved' &&
                  inv.final_amount_usd != null &&
                  inv.final_amount_usd !== '';
                return (
                  <div
                    key={inv.invoice_id}
                    className="rounded-card border border-border bg-surface/80 p-card-padding text-body-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        <Link
                          href={businessRoutes.invoice(inv.invoice_id)}
                          className="text-link"
                        >
                          {inv.invoice_id}
                        </Link>
                        {showSettled ? (
                          <>
                            {' '}
                            · ${formatUsdDisplay(inv.amount_usd)} → $
                            {formatUsdDisplay(inv.final_amount_usd)}
                          </>
                        ) : (
                          <> · ${inv.amount_usd}</>
                        )}
                      </span>
                        <StateBadge variant={invoiceStateBadgeVariant(inv.state)} />
                        {inv.kind === 'multi' ? (
                          <span className="text-caption text-fg-secondary">
                            {t('business_invoice_kind_multi')}
                          </span>
                        ) : null}
                    </div>
                    <p className="mt-1 text-caption text-fg-secondary">
                      @{inv.debtor} → @{inv.creditor}
                    </p>
                    {linkedContract ? (
                      <p className="mt-1 text-caption text-fg-secondary">
                        {t('business_invoice_contract_label')}:{' '}
                        {linkedContractUrl ? (
                          <Link href={linkedContractUrl} className="text-link">
                            {linkedContract}
                          </Link>
                        ) : (
                          linkedContract
                        )}
                      </p>
                    ) : null}
                    {inv.service_order_id ? (
                      <p className="mt-1 text-caption text-fg-secondary">
                        {t('business_field_service_order')}:{' '}
                        <Link
                          href={businessRoutes.serviceOrder(inv.service_order_id)}
                          className="text-link"
                        >
                          {inv.service_order_id}
                        </Link>
                      </p>
                    ) : null}
                    {inv.report_id ? (
                      <p className="mt-1 text-caption text-fg-secondary">
                        {t('business_field_report')}:{' '}
                        <Link href={businessRoutes.report(inv.report_id)} className="text-link">
                          {inv.report_id}
                        </Link>
                      </p>
                    ) : null}
                    <p className="mt-1 text-caption text-fg-secondary">
                      {t('business_field_created_at')}:{' '}
                      <ActivityTimestamp timestamp={inv.created_at} />
                    </p>
                    {detailSummary ? (
                      <p className="mt-2 text-caption text-fg-secondary">{detailSummary}</p>
                    ) : null}
                    {disputable ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setDisputeInvoice(inv)}
                        className="mt-2 text-body-sm text-link disabled:opacity-50"
                      >
                        {t('business_invoice_dispute_action')}
                      </button>
                    ) : null}
                    {inv.state === 'disputed' ? (
                      <p className="mt-2 text-caption text-fg-secondary">
                        {t('business_invoice_in_dispute')}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {tab === 'payments' ? (
            <div className="flex flex-col gap-3">
              {payments.length === 0 ? (
                <p className="text-body-sm text-fg-secondary">{t('business_payments_empty')}</p>
              ) : null}
              {payments.map((pay) => (
                <RelationshipPaymentRow
                  key={pay.payment_id}
                  payment={pay}
                  viewer={username}
                  isBusy={isBusy}
                  onConfirm={setConfirmPaymentRow}
                />
              ))}
            </div>
          ) : null}

          {tab === 'disputes' ? (
            <div className="flex flex-col gap-3">
              {disputes.length === 0 ? (
                <p className="text-body-sm text-fg-secondary">{t('business_disputes_empty')}</p>
              ) : null}
              {disputes.map((d) => {
                const linkedInvoice = findInvoiceForDispute(d, invoices);
                const governingContract = linkedInvoice?.contract_id
                  ? contracts.find((c) => c.contract_id === linkedInvoice.contract_id)
                  : undefined;
                const resolvable = canViewerResolveDispute(username, d, invoices, contracts, {
                  invoice: linkedInvoice,
                  governingContract,
                });
                const linkedContract = contractLabel(linkedInvoice?.contract_id, contracts);
                const linkedContractUrl = contractHref(linkedInvoice?.contract_id);
                return (
                  <div
                    key={d.dispute_id}
                    className="rounded-card border border-border bg-surface/80 p-card-padding text-body-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        href={businessRoutes.dispute(d.dispute_id)}
                        className="text-link"
                      >
                        {d.dispute_id}
                      </Link>
                      <StateBadge variant={d.status === 'open' ? 'disputed' : 'resolved'} />
                    </div>
                    <p className="mt-1 text-caption text-fg-secondary">
                      {t('business_field_invoice')}:{' '}
                      <Link href={businessRoutes.invoice(d.invoice_id)} className="text-link">
                        {d.invoice_id}
                      </Link>
                    </p>
                    {linkedContract ? (
                      <p className="mt-1 text-caption text-fg-secondary">
                        {t('business_invoice_contract_label')}:{' '}
                        {linkedContractUrl ? (
                          <Link href={linkedContractUrl} className="text-link">
                            {linkedContract}
                          </Link>
                        ) : (
                          linkedContract
                        )}
                      </p>
                    ) : null}
                    <DisputeSettlementSummary dispute={d} invoice={linkedInvoice} />
                    <p className="mt-2 text-caption text-fg-secondary">
                      {t('business_field_created_at')}:{' '}
                      <ActivityTimestamp timestamp={d.created_at} />
                    </p>
                    {resolvable ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setResolveDisputeRow(d)}
                        className="mt-2 text-body-sm text-link disabled:opacity-50"
                      >
                        {t('business_dispute_resolve_action')}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
          <div ref={sentinelRef} className="h-4" aria-hidden />
        </div>
      </BusinessPageShell>

      <BusinessIssueInvoiceModal
        open={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        isBusy={isBusy}
        issuer={username}
        counterparty={counterparty}
        debtor={counterparty}
        creditor={username}
        contracts={contracts}
        serviceOrders={serviceOrders}
        onSubmit={issueInvoice}
      />
      <BusinessCreateServiceOrderModal
        open={serviceOrderModalOpen}
        onClose={() => setServiceOrderModalOpen(false)}
        isBusy={isBusy}
        contracts={serviceOrderContracts}
        onSubmit={createServiceOrder}
      />
      <BusinessCreateReportModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        isBusy={isBusy}
        contracts={contracts}
        serviceOrders={serviceOrders}
        onSubmit={createReport}
      />
      <BusinessDeclarePaymentModal
        open={declareModalOpen}
        onClose={() => setDeclareModalOpen(false)}
        isBusy={isBusy}
        viewer={username}
        payer={username}
        receiver={counterparty}
        onSubmit={recordPayment}
      />
      <BusinessConfirmPaymentModal
        open={confirmPaymentRow !== null}
        payment={confirmPaymentRow}
        onClose={() => setConfirmPaymentRow(null)}
        isBusy={isBusy}
        onSubmit={submitPaymentConfirm}
      />
      <BusinessOpenDisputeModal
        open={disputeInvoice !== null}
        invoice={disputeInvoice}
        onClose={() => setDisputeInvoice(null)}
        isBusy={isBusy}
        onSubmit={openDispute}
      />
      <BusinessResolveDisputeModal
        open={resolveDisputeRow !== null}
        dispute={resolveDisputeRow}
        invoice={resolveInvoice}
        authority={resolveAuthority}
        onClose={() => setResolveDisputeRow(null)}
        isBusy={isBusy}
        onSubmit={resolveDispute}
      />
    </>
  );
}
