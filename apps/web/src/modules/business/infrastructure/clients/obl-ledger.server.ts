import 'server-only';

import {
  queryApiFetch,
  queryApiFetchLive,
} from '@/modules/user-profile/infrastructure/clients/query-api.client';
import { queryApiCacheTags } from '@/shared/infrastructure/query/query-api-cache-tags';

import type { PairBalanceView } from '../../domain/ledger.types';
import type { OblCursorPage, OblOffsetPage } from '../../domain/obl-pagination.types';

export type OblLedgerApiResponse = {
  accountA: string;
  accountB: string;
  startedEventSeq: string | null;
  contracts: unknown[];
  invoices: unknown[];
  payments: unknown[];
  disputes: unknown[];
  balance: PairBalanceView;
};

export type OblRelationshipApiRow = {
  counterparty: string;
  roles: Array<'provider' | 'client'>;
  contractCount: number;
  balance: PairBalanceView;
  lastActivityAt: string | null;
  lastActivityEventSeq?: string | null;
};

export type OblContractApiRow = {
  contract_id: string;
  offer_id: string;
  offer_version: number;
  provider: string;
  client: string;
  dispute_rule: 'client' | 'provider' | 'arbiter';
  arbiter: string | null;
  metadata: Record<string, unknown>;
  offer_name: string | null;
  offer_description: string | null;
  service_order_schema: Record<string, unknown> | null;
  created_event_seq: string;
  created_at: string;
  transaction_id: string;
};

export type OblContractSummaryApiRow = OblContractApiRow;

export type OblObligationLineApiRow = {
  line_id: string;
  invoice_id: string;
  debtor: string;
  beneficiary: string;
  creditor: string;
  amount_usd: string;
  final_amount_usd: string | null;
  state: string;
  dispute_group: string;
  role: string | null;
  created_event_seq: string;
  transaction_id: string;
  created_at: string;
};

export type OblServiceOrderApiRow = {
  service_order_id: string;
  contract_id: string;
  creator: string;
  provider: string;
  client: string;
  details: Record<string, unknown>;
  status: 'active' | 'cancelled';
  cancelled_by: string | null;
  cancelled_at: string | null;
  created_event_seq: string;
  transaction_id: string;
  created_at: string;
};

export type OblReportApiRow = {
  report_id: string;
  contract_id: string | null;
  service_order_id: string | null;
  author: string;
  provider: string;
  client: string;
  details: Record<string, unknown>;
  created_event_seq: string;
  transaction_id: string;
  created_at: string;
};

export type OblServiceOrderDetailApiResponse = {
  serviceOrder: OblServiceOrderApiRow;
  contract: OblContractSummaryApiRow | null;
};

export type OblReportDetailApiResponse = {
  report: OblReportApiRow;
  contract: OblContractSummaryApiRow | null;
  serviceOrder: OblServiceOrderApiRow | null;
};

export type OblInvoiceApiRow = {
  invoice_id: string;
  contract_id: string | null;
  service_order_id?: string | null;
  report_id?: string | null;
  issuer: string;
  debtor: string;
  creditor: string;
  amount_usd: string;
  final_amount_usd: string | null;
  details: Record<string, unknown>;
  state: string;
  kind?: 'single' | 'multi';
  lines?: OblObligationLineApiRow[];
  created_event_seq: string;
  transaction_id: string;
  created_at: string;
};

export type OblInvoiceDetailApiResponse = {
  invoice: OblInvoiceApiRow;
  contract: OblContractSummaryApiRow | null;
  serviceOrder: OblServiceOrderApiRow | null;
  report: OblReportApiRow | null;
};

export type OblDisputeApiRow = {
  dispute_id: string;
  invoice_id: string;
  disputant: string;
  proposed_amount_usd: string;
  status: 'open' | 'resolved';
  final_amount_usd: string | null;
  resolver: string | null;
  created_event_seq: string;
  resolved_event_seq: string | null;
  transaction_id: string;
  created_at: string;
};

export type OblDisputeDetailApiResponse = {
  dispute: OblDisputeApiRow;
  invoice: OblInvoiceApiRow;
  contract: OblContractSummaryApiRow | null;
};

function ledgerPairTags(accountA: string, accountB: string): string[] {
  return [queryApiCacheTags.oblLedger(accountA, accountB)];
}

type OblLedgerSubListSegment =
  | 'payments'
  | 'invoices'
  | 'contracts'
  | 'disputes'
  | 'service-orders'
  | 'reports';

function ledgerSubListPath(segment: OblLedgerSubListSegment, params: URLSearchParams): string {
  return `/query/v1/obl/ledger/${segment}?${params.toString()}`;
}

async function fetchOblLedgerSubList<T>(
  segment: OblLedgerSubListSegment,
  accountA: string,
  accountB: string,
  params: URLSearchParams,
  live = false,
): Promise<OblCursorPage<T> | null> {
  params.set('accountA', accountA);
  params.set('accountB', accountB);
  const path = ledgerSubListPath(segment, params);
  const tags = ledgerPairTags(accountA, accountB);
  if (live) {
    return queryApiFetchLive<OblCursorPage<T>>(path);
  }
  return queryApiFetch<OblCursorPage<T>>(path, { cacheTags: tags });
}

export async function fetchOblBalance(accountA: string, accountB: string) {
  const q = new URLSearchParams({ accountA, accountB });
  return queryApiFetch<PairBalanceView>(`/query/v1/obl/balance?${q.toString()}`, {
    cacheTags: ledgerPairTags(accountA, accountB),
  });
}

export async function fetchOblBalanceLive(accountA: string, accountB: string) {
  const q = new URLSearchParams({ accountA, accountB });
  return queryApiFetchLive<PairBalanceView>(`/query/v1/obl/balance?${q.toString()}`);
}

export async function fetchOblLedger(accountA: string, accountB: string) {
  const q = new URLSearchParams({ accountA, accountB });
  return queryApiFetch<OblLedgerApiResponse>(`/query/v1/obl/ledger?${q.toString()}`, {
    cacheTags: ledgerPairTags(accountA, accountB),
  });
}

export async function fetchOblLedgerLive(accountA: string, accountB: string) {
  const q = new URLSearchParams({ accountA, accountB });
  return queryApiFetchLive<OblLedgerApiResponse>(`/query/v1/obl/ledger?${q.toString()}`);
}

export async function fetchOblLedgerPayments(
  accountA: string,
  accountB: string,
  params: URLSearchParams,
) {
  return fetchOblLedgerSubList<unknown>('payments', accountA, accountB, params);
}

export async function fetchOblLedgerInvoices(
  accountA: string,
  accountB: string,
  params: URLSearchParams,
) {
  return fetchOblLedgerSubList<unknown>('invoices', accountA, accountB, params);
}

export async function fetchOblLedgerContracts(
  accountA: string,
  accountB: string,
  params: URLSearchParams,
) {
  return fetchOblLedgerSubList<OblContractApiRow>('contracts', accountA, accountB, params);
}

export async function fetchOblLedgerDisputes(
  accountA: string,
  accountB: string,
  params: URLSearchParams,
) {
  return fetchOblLedgerSubList<unknown>('disputes', accountA, accountB, params);
}

export async function fetchOblLedgerServiceOrders(
  accountA: string,
  accountB: string,
  params: URLSearchParams,
) {
  return fetchOblLedgerSubList<OblServiceOrderApiRow>(
    'service-orders',
    accountA,
    accountB,
    params,
  );
}

export async function fetchOblLedgerReports(
  accountA: string,
  accountB: string,
  params: URLSearchParams,
) {
  return fetchOblLedgerSubList<OblReportApiRow>('reports', accountA, accountB, params);
}

export async function fetchOblRelationships(
  account: string,
  pagination?: { limit?: number; offset?: number },
) {
  const q = new URLSearchParams({ account });
  if (pagination?.limit !== undefined) {
    q.set('limit', String(pagination.limit));
  }
  if (pagination?.offset !== undefined) {
    q.set('offset', String(pagination.offset));
  }
  return queryApiFetch<OblOffsetPage<OblRelationshipApiRow>>(
    `/query/v1/obl/relationships?${q.toString()}`,
    { cacheTags: [queryApiCacheTags.oblRelationships(account)] },
  );
}

export async function fetchOblContract(contractId: string) {
  return queryApiFetch<OblContractApiRow>(
    `/query/v1/obl/contracts/${encodeURIComponent(contractId)}`,
    { cacheTags: [queryApiCacheTags.oblContract(contractId)] },
  );
}

export async function fetchOblInvoice(invoiceId: string) {
  return queryApiFetch<OblInvoiceDetailApiResponse>(
    `/query/v1/obl/invoices/${encodeURIComponent(invoiceId)}`,
    { cacheTags: [queryApiCacheTags.oblInvoice(invoiceId)] },
  );
}

export async function fetchOblServiceOrder(serviceOrderId: string) {
  return queryApiFetch<OblServiceOrderDetailApiResponse>(
    `/query/v1/obl/service-orders/${encodeURIComponent(serviceOrderId)}`,
    { cacheTags: [queryApiCacheTags.oblServiceOrder(serviceOrderId)] },
  );
}

export async function fetchOblReport(reportId: string) {
  return queryApiFetch<OblReportDetailApiResponse>(
    `/query/v1/obl/reports/${encodeURIComponent(reportId)}`,
    { cacheTags: [queryApiCacheTags.oblReport(reportId)] },
  );
}

export async function fetchOblDispute(disputeId: string) {
  return queryApiFetch<OblDisputeDetailApiResponse>(
    `/query/v1/obl/disputes/${encodeURIComponent(disputeId)}`,
    { cacheTags: [queryApiCacheTags.oblDispute(disputeId)] },
  );
}

export async function resolveOfferAlreadySigned(
  viewer: string | null,
  offerId: string,
  author: string,
): Promise<boolean> {
  if (!viewer || viewer === author) {
    return false;
  }
  const page = await fetchOblLedgerContracts(
    viewer,
    author,
    new URLSearchParams({ limit: '50' }),
  );
  if (!page) {
    return false;
  }
  return page.items.some((contract) => contract.offer_id === offerId);
}

export async function convertUsdToWaiv(amountUsd: number) {
  const q = new URLSearchParams({ amountUsd: String(amountUsd) });
  return queryApiFetch<{
    amountUsd: number;
    rateUsd: number | null;
    amountWaiv: number | null;
  }>(`/query/v1/obl/convert/usd-to-waiv?${q.toString()}`);
}
