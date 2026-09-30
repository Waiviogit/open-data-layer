import type { OblInvoiceLineView } from './obl-invoice-line';
import { aggregateInvoiceLineView } from './obl-invoice-line';
import { OblContract, OblDispute, OblInvoice, OblObligationLine, OblReport, OblServiceOrder } from '@opden-data-layer/odl-db-types';

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

export function serializeOblObligationLine(row: OblObligationLine) {
  return {
    line_id: row.line_id,
    invoice_id: row.invoice_id,
    debtor: row.debtor,
    beneficiary: row.beneficiary,
    creditor: row.beneficiary,
    amount_usd: String(row.amount_usd),
    final_amount_usd:
      row.final_amount_usd !== null && row.final_amount_usd !== undefined
        ? String(row.final_amount_usd)
        : null,
    state: row.state,
    dispute_group: row.dispute_group,
    role: row.role,
    created_event_seq: row.created_event_seq.toString(),
    transaction_id: row.transaction_id,
    created_at: toIso(row.created_at),
  };
}

export function serializeOblDispute(row: OblDispute) {
  return {
    dispute_id: row.dispute_id,
    invoice_id: row.invoice_id,
    disputant: row.disputant,
    proposed_amount_usd: String(row.proposed_amount_usd),
    status: row.status,
    final_amount_usd:
      row.final_amount_usd !== null && row.final_amount_usd !== undefined
        ? String(row.final_amount_usd)
        : null,
    resolver: row.resolver,
    created_event_seq: row.created_event_seq.toString(),
    resolved_event_seq:
      row.resolved_event_seq !== null && row.resolved_event_seq !== undefined
        ? row.resolved_event_seq.toString()
        : null,
    transaction_id: row.transaction_id,
    created_at: toIso(row.created_at),
  };
}

export function serializeOblInvoiceLine(row: OblInvoiceLineView) {
  return {
    invoice_id: row.invoice_id,
    contract_id: row.contract_id,
    service_order_id: row.service_order_id,
    report_id: row.report_id,
    issuer: row.issuer,
    debtor: row.debtor,
    kind: row.kind,
    creditor: row.creditor,
    amount_usd: row.amount_usd,
    final_amount_usd: row.final_amount_usd,
    details: row.details,
    state: row.state,
    line_id: row.line_id,
    beneficiary: row.beneficiary,
    role: row.role,
    created_event_seq: row.created_event_seq.toString(),
    transaction_id: row.transaction_id,
    created_at: toIso(row.created_at),
  };
}

export function serializeOblInvoiceFromHeader(
  header: OblInvoice,
  lines: readonly OblObligationLine[],
) {
  const view = aggregateInvoiceLineView(header, lines);
  if (!view) {
    return {
      invoice_id: header.invoice_id,
      contract_id: header.contract_id,
      service_order_id: header.service_order_id,
      report_id: header.report_id,
      issuer: header.issuer,
      debtor: header.debtor,
      kind: header.kind,
      creditor: null,
      amount_usd: null,
      final_amount_usd: null,
      details: header.details,
      state: null,
      lines: lines.map(serializeOblObligationLine),
      created_event_seq: header.created_event_seq.toString(),
      transaction_id: header.transaction_id,
      created_at: toIso(header.created_at),
    };
  }
  return {
    ...serializeOblInvoiceLine(view),
    lines: lines.map(serializeOblObligationLine),
  };
}

/** @deprecated Use serializeOblInvoiceLine for list rows or serializeOblInvoiceFromHeader for detail. */
export function serializeOblInvoice(row: OblInvoiceLineView) {
  return serializeOblInvoiceLine(row);
}

export function serializeOblServiceOrder(row: OblServiceOrder) {
  return {
    service_order_id: row.service_order_id,
    contract_id: row.contract_id,
    creator: row.creator,
    provider: row.provider,
    client: row.client,
    details: row.details,
    status: row.status,
    cancelled_by: row.cancelled_by,
    cancelled_at: row.cancelled_at ? toIso(row.cancelled_at) : null,
    created_event_seq: row.created_event_seq.toString(),
    transaction_id: row.transaction_id,
    created_at: toIso(row.created_at),
  };
}

export function serializeOblReport(row: OblReport) {
  return {
    report_id: row.report_id,
    contract_id: row.contract_id,
    service_order_id: row.service_order_id,
    author: row.author,
    provider: row.provider,
    client: row.client,
    details: row.details,
    created_event_seq: row.created_event_seq.toString(),
    transaction_id: row.transaction_id,
    created_at: toIso(row.created_at),
  };
}

export function serializeOblContract(
  row: OblContract,
  offerName?: string | null,
  offerDescription?: string | null,
) {
  return {
    contract_id: row.contract_id,
    offer_id: row.offer_id,
    offer_version: row.offer_version,
    provider: row.provider,
    client: row.client,
    dispute_rule: row.dispute_rule,
    arbiter: row.arbiter,
    metadata: row.metadata,
    offer_name: offerName ?? null,
    offer_description: offerDescription ?? null,
    service_order_schema: row.service_order_schema ?? null,
    created_event_seq: row.created_event_seq.toString(),
    transaction_id: row.transaction_id,
    created_at: toIso(row.created_at),
  };
}
