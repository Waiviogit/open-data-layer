import { BadRequestException, Injectable } from '@nestjs/common';
import { OblContract, OblDispute, OblOffer, OblPayment } from '@opden-data-layer/odl-db-types';

import { normalizeHiveAccount } from '../../auth';
import { OblRepository } from '../../repositories/obl.repository';
import { computePairBalance } from './compute-pair-balance';
import { buildOffsetPage } from './obl-pagination';
import { filterByLedgerCutoff, normalizePair } from './obl-pair-utils';
import { toBalanceInvoiceRow, type OblInvoiceLineView } from './obl-invoice-line';
import { serializeOblServiceOrder } from './obl-row-serialize';
import type { OblLedgerListQuery, SearchOblOffersQuery } from './obl.schemas';

function toBalanceInvoices(invoices: readonly OblInvoiceLineView[]) {
  return invoices.map((inv) => toBalanceInvoiceRow(inv));
}

function toBalancePayments(payments: readonly OblPayment[]) {
  return payments.map((pay) => ({
    payer: pay.payer,
    receiver: pay.receiver,
    amount_usd: String(pay.amount_usd),
    state: pay.state,
  }));
}

@Injectable()
export class OblOffersService {
  constructor(private readonly obl: OblRepository) {}

  async search(query: SearchOblOffersQuery) {
    const rows = await this.obl.searchOffers({
      q: query.q,
      kind: query.kind,
      tags: query.tags,
      author: query.author ? normalizeHiveAccount(query.author) : undefined,
      status: query.status,
      limit: query.limit + 1,
      offset: query.offset,
    });
    return buildOffsetPage(rows, query.limit);
  }

  async getOffer(offerId: string, version?: number): Promise<OblOffer | null> {
    return this.obl.findOffer(offerId, version);
  }
}

@Injectable()
export class OblLedgerService {
  constructor(private readonly obl: OblRepository) {}

  private async resolvePair(accountA: string, accountB: string) {
    const normalizedA = normalizeHiveAccount(accountA);
    const normalizedB = normalizeHiveAccount(accountB);
    if (normalizedA === normalizedB) {
      throw new BadRequestException('accountA and accountB must differ');
    }
    const { pairLow, pairHigh } = normalizePair(normalizedA, normalizedB);
    const startedSeq = await this.obl.findLedgerStartedSeq(pairLow, pairHigh);
    return { normalizedA, normalizedB, pairLow, pairHigh, startedSeq };
  }

  async getLedger(accountA: string, accountB: string): Promise<{
    accountA: string;
    accountB: string;
    startedEventSeq: string | null;
    contracts: Array<
      OblContract & {
        offer_name: string;
        offer_description: string | null;
      }
    >;
    invoices: OblInvoiceLineView[];
    payments: OblPayment[];
    disputes: OblDispute[];
    balance: ReturnType<typeof computePairBalance>;
  }> {
    const { normalizedA, normalizedB, pairLow, pairHigh, startedSeq } =
      await this.resolvePair(accountA, accountB);

    const [allContracts, allInvoices, allPayments] = await Promise.all([
      this.obl.listContractsForPairWithOffer(pairLow, pairHigh),
      this.obl.listInvoicesForPair(pairLow, pairHigh),
      this.obl.listPaymentsForPair(pairLow, pairHigh),
    ]);

    const contracts = filterByLedgerCutoff(allContracts, startedSeq);
    const invoices = filterByLedgerCutoff(allInvoices, startedSeq);
    const payments = filterByLedgerCutoff(allPayments, startedSeq);

    const disputes = await this.obl.listDisputesForInvoices(
      invoices.map((inv) => inv.invoice_id),
    );

    const balance = computePairBalance(
      normalizedA,
      normalizedB,
      toBalanceInvoices(invoices),
      toBalancePayments(payments),
    );

    return {
      accountA: normalizedA,
      accountB: normalizedB,
      startedEventSeq: startedSeq !== null ? startedSeq.toString() : null,
      contracts,
      invoices,
      payments,
      disputes,
      balance,
    };
  }

  async listPayments(query: OblLedgerListQuery) {
    const { pairLow, pairHigh, startedSeq } = await this.resolvePair(
      query.accountA,
      query.accountB,
    );
    return this.obl.listPaymentsForPairPaginated(
      pairLow,
      pairHigh,
      query.limit,
      query.cursor,
      startedSeq,
    );
  }

  async listInvoices(query: OblLedgerListQuery) {
    const { pairLow, pairHigh, startedSeq } = await this.resolvePair(
      query.accountA,
      query.accountB,
    );
    return this.obl.listInvoicesForPairPaginated(
      pairLow,
      pairHigh,
      query.limit,
      query.cursor,
      startedSeq,
    );
  }

  async listContracts(query: OblLedgerListQuery) {
    const { pairLow, pairHigh, startedSeq } = await this.resolvePair(
      query.accountA,
      query.accountB,
    );
    return this.obl.listContractsForPairWithOfferPaginated(
      pairLow,
      pairHigh,
      query.limit,
      query.cursor,
      startedSeq,
    );
  }

  async listDisputes(query: OblLedgerListQuery) {
    const { pairLow, pairHigh, startedSeq } = await this.resolvePair(
      query.accountA,
      query.accountB,
    );
    return this.obl.listDisputesForPairPaginated(
      pairLow,
      pairHigh,
      query.limit,
      query.cursor,
      startedSeq,
    );
  }

  async listServiceOrders(query: OblLedgerListQuery) {
    const { pairLow, pairHigh, startedSeq } = await this.resolvePair(
      query.accountA,
      query.accountB,
    );
    const page = await this.obl.listServiceOrdersForPairPaginated(
      pairLow,
      pairHigh,
      query.limit,
      query.cursor,
      startedSeq,
    );
    return {
      items: page.items.map(serializeOblServiceOrder),
      hasMore: page.hasMore,
      nextCursor: page.nextCursor,
    };
  }

  async listReports(query: OblLedgerListQuery) {
    const { pairLow, pairHigh, startedSeq } = await this.resolvePair(
      query.accountA,
      query.accountB,
    );
    const page = await this.obl.listReportsForPairPaginated(
      pairLow,
      pairHigh,
      query.limit,
      query.cursor,
      startedSeq,
    );
    return {
      items: page.items.map((row) => ({
        report_id: row.report_id,
        contract_id: row.contract_id,
        service_order_id: row.service_order_id,
        author: row.author,
        provider: row.provider,
        client: row.client,
        details: row.details,
        created_event_seq: row.created_event_seq.toString(),
        transaction_id: row.transaction_id,
        created_at:
          row.created_at instanceof Date
            ? row.created_at.toISOString()
            : String(row.created_at),
      })),
      hasMore: page.hasMore,
      nextCursor: page.nextCursor,
    };
  }
}
