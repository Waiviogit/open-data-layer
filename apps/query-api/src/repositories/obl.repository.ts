import { Injectable, Inject } from '@nestjs/common';
import { sql, type Kysely } from 'kysely';
import { NewOblOfferDraft, OblContract, OblDispute, OblInvoice, OblObligationLine, OblOffer, OblOfferDraft, OblOfferDraftUpdate, OblPayment, OblReport, OblServiceOrder } from '@opden-data-layer/odl-db-types';

import type { Database } from '../database';
import { KYSELY } from '../database';
import {
  buildCursorPageFromRows,
  decodeOblCursor,
  type CursorPage,
} from '../domain/obl/obl-pagination';
import {
  mapInvoiceLineJoin,
  type OblInvoiceLineView,
} from '../domain/obl/obl-invoice-line';
import { pairKey } from '../domain/obl/obl-pair-utils';

export type OblPairRef = { pairLow: string; pairHigh: string };

export type OblPairContractSummary = {
  total: number;
  asProvider: number;
  asClient: number;
};

export type OblArbitrationJoinRow = {
  dispute: OblDispute;
  invoice: OblInvoice;
  contract: OblContract;
  offer_name: string | null;
};

type OblArbitrationRawRow = OblDispute & {
  i_invoice_id: string;
  i_issuer: string;
  i_debtor: string;
  i_kind: OblInvoice['kind'];
  i_contract_id: string | null;
  i_service_order_id: string | null;
  i_report_id: string | null;
  i_details: OblInvoice['details'];
  i_created_event_seq: bigint;
  i_transaction_id: string;
  i_created_at: OblInvoice['created_at'];
  c_contract_id: string;
  c_offer_id: string;
  c_offer_version: number;
  c_provider: string;
  c_client: string;
  c_dispute_rule: OblContract['dispute_rule'];
  c_arbiter: string | null;
  c_metadata: OblContract['metadata'];
  c_service_order_schema: OblContract['service_order_schema'];
  c_pair_low: string;
  c_pair_high: string;
  c_created_event_seq: bigint;
  c_transaction_id: string;
  c_created_at: OblContract['created_at'];
  offer_name: string | null;
};

function mapArbitrationRawRow(row: OblArbitrationRawRow): OblArbitrationJoinRow {
  const {
    i_invoice_id,
    i_issuer,
    i_debtor,
    i_kind,
    i_contract_id,
    i_service_order_id,
    i_report_id,
    i_details,
    i_created_event_seq,
    i_transaction_id,
    i_created_at,
    c_contract_id,
    c_offer_id,
    c_offer_version,
    c_provider,
    c_client,
    c_dispute_rule,
    c_arbiter,
    c_metadata,
    c_service_order_schema,
    c_pair_low,
    c_pair_high,
    c_created_event_seq,
    c_transaction_id,
    c_created_at,
    offer_name,
    ...dispute
  } = row;
  return {
    dispute,
    invoice: {
      invoice_id: i_invoice_id,
      contract_id: i_contract_id,
      service_order_id: i_service_order_id,
      report_id: i_report_id,
      issuer: i_issuer,
      debtor: i_debtor,
      kind: i_kind,
      details: i_details,
      created_event_seq: i_created_event_seq,
      transaction_id: i_transaction_id,
      created_at: i_created_at,
    },
    contract: {
      contract_id: c_contract_id,
      offer_id: c_offer_id,
      offer_version: c_offer_version,
      provider: c_provider,
      client: c_client,
      dispute_rule: c_dispute_rule,
      arbiter: c_arbiter,
      metadata: c_metadata,
      service_order_schema: c_service_order_schema,
      pair_low: c_pair_low,
      pair_high: c_pair_high,
      created_event_seq: c_created_event_seq,
      transaction_id: c_transaction_id,
      created_at: c_created_at,
    },
    offer_name,
  };
}

function jsonForJsonb(value: unknown): Record<string, unknown> {
  if (value === undefined || value === null) {
    return {};
  }
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

@Injectable()
export class OblRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  private invoiceLineBaseQuery() {
    return this.db
      .selectFrom('obl_obligation_lines as l')
      .innerJoin('obl_invoices as i', 'i.invoice_id', 'l.invoice_id')
      .select([
        'i.invoice_id',
        'i.contract_id',
        'i.service_order_id',
        'i.report_id',
        'i.issuer',
        'i.debtor',
        'i.kind',
        'i.details',
        'i.created_event_seq',
        'i.transaction_id',
        'i.created_at',
        'l.line_id',
        'l.beneficiary',
        'l.amount_usd',
        'l.final_amount_usd',
        'l.state',
        'l.role',
        'l.dispute_group',
        'l.pair_low',
        'l.pair_high',
      ]);
  }

  private mapInvoiceLineRows(
    rows: Array<{
      invoice_id: string;
      contract_id: string | null;
      service_order_id: string | null;
      report_id: string | null;
      issuer: string;
      debtor: string;
      kind: OblInvoice['kind'];
      details: OblInvoice['details'];
      created_event_seq: bigint;
      transaction_id: string;
      created_at: OblInvoice['created_at'];
      line_id: string;
      beneficiary: string;
      amount_usd: string | number;
      final_amount_usd: string | number | null;
      state: OblObligationLine['state'];
      role: string | null;
      dispute_group: string;
      pair_low: string;
      pair_high: string;
    }>,
  ): OblInvoiceLineView[] {
    return rows.map((row) => mapInvoiceLineJoin(row));
  }

  async searchOffers(input: {
    q?: string;
    kind?: 'offer' | 'request';
    tags?: string[];
    author?: string;
    status?: 'active' | 'retired' | 'all';
    limit: number;
    offset: number;
  }): Promise<OblOffer[]> {
    let latestQb = this.db
      .selectFrom('obl_offers')
      .distinctOn('offer_id')
      .selectAll()
      .orderBy('offer_id')
      .orderBy('version', 'desc');

    const status = input.status ?? 'active';
    if (status !== 'all') {
      latestQb = latestQb.where('status', '=', status);
    }

    if (input.kind) {
      latestQb = latestQb.where('kind', '=', input.kind);
    }
    if (input.author) {
      latestQb = latestQb.where('author', '=', input.author);
    }
    if (input.tags && input.tags.length > 0) {
      latestQb = latestQb.where(sql<boolean>`tags @> ${sql.val(input.tags)}::text[]`);
    }
    const q = input.q?.trim();
    if (q) {
      const pattern = `%${q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
      latestQb = latestQb.where((eb) =>
        eb.or([
          eb('name', 'ilike', pattern),
          eb('description', 'ilike', pattern),
        ]),
      );
    }

    const latest = latestQb.as('latest_offers');

    return this.db
      .selectFrom(latest)
      .selectAll()
      .orderBy('created_at', 'desc')
      .orderBy('created_event_seq', 'desc')
      .limit(input.limit)
      .offset(input.offset)
      .execute();
  }

  async findLedgerStartedSeq(
    pairLow: string,
    pairHigh: string,
  ): Promise<bigint | null> {
    const ledger = await this.db
      .selectFrom('obl_ledgers')
      .where('pair_low', '=', pairLow)
      .where('pair_high', '=', pairHigh)
      .select('started_event_seq')
      .executeTakeFirst();
    if (ledger) {
      return ledger.started_event_seq;
    }
    const contract = await this.db
      .selectFrom('obl_contracts')
      .where('pair_low', '=', pairLow)
      .where('pair_high', '=', pairHigh)
      .orderBy('created_event_seq', 'asc')
      .select('created_event_seq')
      .executeTakeFirst();
    return contract?.created_event_seq ?? null;
  }

  async listCounterpartiesPaginated(
    account: string,
    limit: number,
    offset: number,
  ): Promise<string[]> {
    const union = this.counterpartyUnionQuery(account).as('counterparties');
    const rows = await this.db
      .selectFrom(union)
      .select('counterparty')
      .distinct()
      .orderBy('counterparty')
      .limit(limit)
      .offset(offset)
      .execute();
    return rows.map((row) => row.counterparty);
  }

  private counterpartyUnionQuery(account: string) {
    const asProvider = this.db
      .selectFrom('obl_contracts')
      .select('client as counterparty')
      .where('provider', '=', account);
    const asClient = this.db
      .selectFrom('obl_contracts')
      .select('provider as counterparty')
      .where('client', '=', account);
    const asDebtorOnLines = this.db
      .selectFrom('obl_obligation_lines')
      .select('beneficiary as counterparty')
      .where('debtor', '=', account);
    const asBeneficiaryOnLines = this.db
      .selectFrom('obl_obligation_lines')
      .select('debtor as counterparty')
      .where('beneficiary', '=', account);
    const asPayer = this.db
      .selectFrom('obl_payments')
      .select('receiver as counterparty')
      .where('payer', '=', account);
    const asReceiver = this.db
      .selectFrom('obl_payments')
      .select('payer as counterparty')
      .where('receiver', '=', account);

    return asProvider
      .union(asClient)
      .union(asDebtorOnLines)
      .union(asBeneficiaryOnLines)
      .union(asPayer)
      .union(asReceiver);
  }

  async summarizeContractsForAccountPairs(
    account: string,
    pairs: readonly OblPairRef[],
  ): Promise<Map<string, OblPairContractSummary>> {
    const result = new Map<string, OblPairContractSummary>();
    if (pairs.length === 0) {
      return result;
    }
    const rows = await this.db
      .selectFrom('obl_contracts')
      .select([
        'pair_low',
        'pair_high',
        sql<number>`count(*)::int`.as('total'),
        sql<number>`count(*) filter (where provider = ${account})::int`.as(
          'as_provider',
        ),
        sql<number>`count(*) filter (where client = ${account})::int`.as('as_client'),
      ])
      .where((eb) =>
        eb.or(
          pairs.map((pair) =>
            eb.and([
              eb('pair_low', '=', pair.pairLow),
              eb('pair_high', '=', pair.pairHigh),
            ]),
          ),
        ),
      )
      .groupBy(['pair_low', 'pair_high'])
      .execute();
    for (const row of rows) {
      result.set(pairKey(row.pair_low, row.pair_high), {
        total: row.total,
        asProvider: row.as_provider,
        asClient: row.as_client,
      });
    }
    return result;
  }

  async findLedgerStartedSeqsForPairs(
    pairs: readonly OblPairRef[],
  ): Promise<Map<string, bigint | null>> {
    const result = new Map<string, bigint | null>();
    if (pairs.length === 0) {
      return result;
    }
    for (const pair of pairs) {
      result.set(pairKey(pair.pairLow, pair.pairHigh), null);
    }
    const ledgerRows = await this.db
      .selectFrom('obl_ledgers')
      .select(['pair_low', 'pair_high', 'started_event_seq'])
      .where((eb) =>
        eb.or(
          pairs.map((pair) =>
            eb.and([
              eb('pair_low', '=', pair.pairLow),
              eb('pair_high', '=', pair.pairHigh),
            ]),
          ),
        ),
      )
      .execute();
    for (const row of ledgerRows) {
      result.set(pairKey(row.pair_low, row.pair_high), row.started_event_seq);
    }
    const missing = pairs.filter(
      (pair) => result.get(pairKey(pair.pairLow, pair.pairHigh)) === null,
    );
    if (missing.length === 0) {
      return result;
    }
    const contractRows = await this.db
      .selectFrom('obl_contracts')
      .select([
        'pair_low',
        'pair_high',
        sql<bigint>`min(created_event_seq)`.as('started_event_seq'),
      ])
      .where((eb) =>
        eb.or(
          missing.map((pair) =>
            eb.and([
              eb('pair_low', '=', pair.pairLow),
              eb('pair_high', '=', pair.pairHigh),
            ]),
          ),
        ),
      )
      .groupBy(['pair_low', 'pair_high'])
      .execute();
    for (const row of contractRows) {
      result.set(pairKey(row.pair_low, row.pair_high), row.started_event_seq);
    }
    return result;
  }

  async latestContractActivitySeqForPairs(
    pairs: readonly OblPairRef[],
  ): Promise<Map<string, bigint | null>> {
    const result = new Map<string, bigint | null>();
    if (pairs.length === 0) {
      return result;
    }
    const [contractRows, lineRows, paymentRows] = await Promise.all([
      this.db
        .selectFrom('obl_contracts')
        .select([
          'pair_low',
          'pair_high',
          sql<bigint>`max(created_event_seq)`.as('last_seq'),
        ])
        .where((eb) =>
          eb.or(
            pairs.map((pair) =>
              eb.and([
                eb('pair_low', '=', pair.pairLow),
                eb('pair_high', '=', pair.pairHigh),
              ]),
            ),
          ),
        )
        .groupBy(['pair_low', 'pair_high'])
        .execute(),
      this.db
        .selectFrom('obl_obligation_lines')
        .select([
          'pair_low',
          'pair_high',
          sql<bigint>`max(created_event_seq)`.as('last_seq'),
        ])
        .where((eb) =>
          eb.or(
            pairs.map((pair) =>
              eb.and([
                eb('pair_low', '=', pair.pairLow),
                eb('pair_high', '=', pair.pairHigh),
              ]),
            ),
          ),
        )
        .groupBy(['pair_low', 'pair_high'])
        .execute(),
      this.db
        .selectFrom('obl_payments')
        .select([
          'pair_low',
          'pair_high',
          sql<bigint>`max(created_event_seq)`.as('last_seq'),
        ])
        .where((eb) =>
          eb.or(
            pairs.map((pair) =>
              eb.and([
                eb('pair_low', '=', pair.pairLow),
                eb('pair_high', '=', pair.pairHigh),
              ]),
            ),
          ),
        )
        .groupBy(['pair_low', 'pair_high'])
        .execute(),
    ]);

    for (const rows of [contractRows, lineRows, paymentRows]) {
      for (const row of rows) {
        const key = pairKey(row.pair_low, row.pair_high);
        const prev = result.get(key) ?? null;
        if (prev === null || row.last_seq > prev) {
          result.set(key, row.last_seq);
        }
      }
    }
    return result;
  }

  async listInvoicesForPairs(
    pairs: readonly OblPairRef[],
  ): Promise<OblInvoiceLineView[]> {
    if (pairs.length === 0) {
      return [];
    }
    const rows = await this.invoiceLineBaseQuery()
      .where((eb) =>
        eb.or(
          pairs.map((pair) =>
            eb.and([
              eb('l.pair_low', '=', pair.pairLow),
              eb('l.pair_high', '=', pair.pairHigh),
            ]),
          ),
        ),
      )
      .execute();
    return this.mapInvoiceLineRows(rows);
  }

  async listPaymentsForPairs(pairs: readonly OblPairRef[]): Promise<OblPayment[]> {
    if (pairs.length === 0) {
      return [];
    }
    return this.db
      .selectFrom('obl_payments')
      .selectAll()
      .where((eb) =>
        eb.or(
          pairs.map((pair) =>
            eb.and([
              eb('pair_low', '=', pair.pairLow),
              eb('pair_high', '=', pair.pairHigh),
            ]),
          ),
        ),
      )
      .execute();
  }

  async listContractsForPairWithOfferPaginated(
    pairLow: string,
    pairHigh: string,
    limit: number,
    cursor: string | undefined,
    startedSeq: bigint | null,
  ): Promise<CursorPage<
    OblContract & {
      offer_name: string;
      offer_description: string | null;
      offer_status: 'active' | 'retired';
    }
  >> {
    const decoded = decodeOblCursor(cursor);
    let qb = this.db
      .selectFrom('obl_contracts as c')
      .innerJoin('obl_offers as o', (join) =>
        join
          .onRef('o.offer_id', '=', 'c.offer_id')
          .onRef('o.version', '=', 'c.offer_version'),
      )
      .selectAll('c')
      .select([
        'o.name as offer_name',
        'o.description as offer_description',
        'o.status as offer_status',
      ])
      .where('c.pair_low', '=', pairLow)
      .where('c.pair_high', '=', pairHigh);
    if (startedSeq !== null) {
      qb = qb.where('c.created_event_seq', '>=', startedSeq);
    }
    if (decoded) {
      qb = qb.where((eb) =>
        eb.or([
          eb('c.created_event_seq', '<', decoded.seq),
          eb.and([
            eb('c.created_event_seq', '=', decoded.seq),
            eb('c.contract_id', '<', decoded.id),
          ]),
        ]),
      );
    }
    const rows = await qb
      .orderBy('c.created_at', 'desc')
      .orderBy('c.created_event_seq', 'desc')
      .orderBy('c.contract_id', 'desc')
      .limit(limit + 1)
      .execute();
    return buildCursorPageFromRows(rows, limit, (row) => ({
      seq: row.created_event_seq,
      id: row.contract_id,
    }));
  }

  private governingContractIdsSubquery(
    pairLow: string,
    pairHigh: string,
  ) {
    return this.db
      .selectFrom('obl_contracts as gc')
      .select('gc.contract_id')
      .where('gc.pair_low', '=', pairLow)
      .where('gc.pair_high', '=', pairHigh);
  }

  async listInvoicesForPairPaginated(
    pairLow: string,
    pairHigh: string,
    limit: number,
    cursor: string | undefined,
    startedSeq: bigint | null,
  ): Promise<CursorPage<OblInvoiceLineView>> {
    const decoded = decodeOblCursor(cursor);
    const governingContracts = this.governingContractIdsSubquery(pairLow, pairHigh);
    let qb = this.invoiceLineBaseQuery().where((eb) =>
      eb.or([
        eb.and([
          eb('l.pair_low', '=', pairLow),
          eb('l.pair_high', '=', pairHigh),
        ]),
        eb('i.contract_id', 'in', governingContracts),
      ]),
    );
    if (startedSeq !== null) {
      qb = qb.where('l.created_event_seq', '>=', startedSeq);
    }
    if (decoded) {
      qb = qb.where((eb) =>
        eb.or([
          eb('l.created_event_seq', '<', decoded.seq),
          eb.and([
            eb('l.created_event_seq', '=', decoded.seq),
            eb('l.line_id', '<', decoded.id),
          ]),
        ]),
      );
    }
    const rows = await qb
      .orderBy('l.created_at', 'desc')
      .orderBy('l.created_event_seq', 'desc')
      .orderBy('l.line_id', 'desc')
      .limit(limit + 1)
      .execute();
    const page = buildCursorPageFromRows(rows, limit, (row) => ({
      seq: row.created_event_seq,
      id: row.line_id,
    }));
    return {
      items: this.mapInvoiceLineRows(page.items),
      hasMore: page.hasMore,
      nextCursor: page.nextCursor,
    };
  }

  async listPaymentsForPairPaginated(
    pairLow: string,
    pairHigh: string,
    limit: number,
    cursor: string | undefined,
    startedSeq: bigint | null,
  ): Promise<CursorPage<OblPayment>> {
    const decoded = decodeOblCursor(cursor);
    let qb = this.db
      .selectFrom('obl_payments')
      .selectAll()
      .where('pair_low', '=', pairLow)
      .where('pair_high', '=', pairHigh);
    if (startedSeq !== null) {
      qb = qb.where('created_event_seq', '>=', startedSeq);
    }
    if (decoded) {
      qb = qb.where((eb) =>
        eb.or([
          eb('created_event_seq', '<', decoded.seq),
          eb.and([
            eb('created_event_seq', '=', decoded.seq),
            eb('payment_id', '<', decoded.id),
          ]),
        ]),
      );
    }
    const rows = await qb
      .orderBy('created_at', 'desc')
      .orderBy('created_event_seq', 'desc')
      .orderBy('payment_id', 'desc')
      .limit(limit + 1)
      .execute();
    return buildCursorPageFromRows(rows, limit, (row) => ({
      seq: row.created_event_seq,
      id: row.payment_id,
    }));
  }

  async listDisputesForPairPaginated(
    pairLow: string,
    pairHigh: string,
    limit: number,
    cursor: string | undefined,
    startedSeq: bigint | null,
  ): Promise<CursorPage<OblDispute>> {
    const decoded = decodeOblCursor(cursor);
    const governingContracts = this.governingContractIdsSubquery(pairLow, pairHigh);
    let qb = this.db
      .selectFrom('obl_disputes as d')
      .selectAll('d')
      .where((eb) =>
        eb.or([
          eb.exists(
            eb
              .selectFrom('obl_obligation_lines as l')
              .select('l.line_id')
              .whereRef('l.invoice_id', '=', 'd.invoice_id')
              .where('l.pair_low', '=', pairLow)
              .where('l.pair_high', '=', pairHigh),
          ),
          eb.exists(
            eb
              .selectFrom('obl_invoices as gi')
              .select('gi.invoice_id')
              .whereRef('gi.invoice_id', '=', 'd.invoice_id')
              .where('gi.contract_id', 'in', governingContracts),
          ),
        ]),
      );
    if (startedSeq !== null) {
      qb = qb.where('d.created_event_seq', '>=', startedSeq);
    }
    if (decoded) {
      qb = qb.where((eb) =>
        eb.or([
          eb('d.created_event_seq', '<', decoded.seq),
          eb.and([
            eb('d.created_event_seq', '=', decoded.seq),
            eb('d.dispute_id', '<', decoded.id),
          ]),
        ]),
      );
    }
    const rows = await qb
      .orderBy('d.created_at', 'desc')
      .orderBy('d.created_event_seq', 'desc')
      .orderBy('d.dispute_id', 'desc')
      .limit(limit + 1)
      .execute();
    return buildCursorPageFromRows(rows, limit, (row) => ({
      seq: row.created_event_seq,
      id: row.dispute_id,
    }));
  }

  private disputeContractJoinSelect() {
    return this.db
      .selectFrom('obl_disputes as d')
      .innerJoin('obl_invoices as i', 'i.invoice_id', 'd.invoice_id')
      .innerJoin('obl_contracts as c', 'c.contract_id', 'i.contract_id')
      .leftJoin('obl_offers as o', (join) =>
        join
          .onRef('o.offer_id', '=', 'c.offer_id')
          .onRef('o.version', '=', 'c.offer_version'),
      )
      .selectAll('d')
      .select([
        'i.invoice_id as i_invoice_id',
        'i.issuer as i_issuer',
        'i.debtor as i_debtor',
        'i.kind as i_kind',
        'i.contract_id as i_contract_id',
        'i.service_order_id as i_service_order_id',
        'i.report_id as i_report_id',
        'i.details as i_details',
        'i.created_event_seq as i_created_event_seq',
        'i.transaction_id as i_transaction_id',
        'i.created_at as i_created_at',
        'c.contract_id as c_contract_id',
        'c.offer_id as c_offer_id',
        'c.offer_version as c_offer_version',
        'c.provider as c_provider',
        'c.client as c_client',
        'c.dispute_rule as c_dispute_rule',
        'c.arbiter as c_arbiter',
        'c.metadata as c_metadata',
        'c.service_order_schema as c_service_order_schema',
        'c.pair_low as c_pair_low',
        'c.pair_high as c_pair_high',
        'c.created_event_seq as c_created_event_seq',
        'c.transaction_id as c_transaction_id',
        'c.created_at as c_created_at',
        'o.name as offer_name',
      ]);
  }

  private async listDisputeContractJoinPage(
    limit: number,
    cursor: string | undefined,
    applyAccountFilter: (
      qb: ReturnType<OblRepository['disputeContractJoinSelect']>,
    ) => ReturnType<OblRepository['disputeContractJoinSelect']>,
    status: 'open' | 'resolved',
  ): Promise<CursorPage<OblArbitrationJoinRow>> {
    const decoded = decodeOblCursor(cursor);
    let qb = applyAccountFilter(this.disputeContractJoinSelect()).where(
      'd.status',
      '=',
      status,
    );
    if (decoded) {
      qb = qb.where((eb) =>
        eb.or([
          eb('d.created_event_seq', '<', decoded.seq),
          eb.and([
            eb('d.created_event_seq', '=', decoded.seq),
            eb('d.dispute_id', '<', decoded.id),
          ]),
        ]),
      );
    }
    const rows = (await qb
      .orderBy('d.created_at', 'desc')
      .orderBy('d.created_event_seq', 'desc')
      .orderBy('d.dispute_id', 'desc')
      .limit(limit + 1)
      .execute()) as OblArbitrationRawRow[];
    const page = buildCursorPageFromRows(rows, limit, (row) => ({
      seq: row.created_event_seq,
      id: row.dispute_id,
    }));
    return {
      items: page.items.map(mapArbitrationRawRow),
      hasMore: page.hasMore,
      nextCursor: page.nextCursor,
    };
  }

  async listArbitrationDisputesForAccount(
    account: string,
    status: 'open' | 'resolved',
    limit: number,
    cursor: string | undefined,
  ): Promise<CursorPage<OblArbitrationJoinRow>> {
    return this.listDisputeContractJoinPage(
      limit,
      cursor,
      (qb) =>
        qb
          .where('c.dispute_rule', '=', 'arbiter')
          .where('c.arbiter', '=', account),
      status,
    );
  }

  async listResolverDisputesForAccount(
    account: string,
    status: 'open' | 'resolved',
    limit: number,
    cursor: string | undefined,
  ): Promise<CursorPage<OblArbitrationJoinRow>> {
    return this.listDisputeContractJoinPage(
      limit,
      cursor,
      (qb) =>
        qb.where((eb) =>
          eb.or([
            eb.and([
              eb('c.dispute_rule', '=', 'provider'),
              eb('c.provider', '=', account),
            ]),
            eb.and([
              eb('c.dispute_rule', '=', 'client'),
              eb('c.client', '=', account),
            ]),
          ]),
        ),
      status,
    );
  }

  async listContractsForPairWithOffer(
    pairLow: string,
    pairHigh: string,
  ): Promise<
    Array<
      OblContract & {
        offer_name: string;
        offer_description: string | null;
        offer_status: 'active' | 'retired';
      }
    >
  > {
    return this.db
      .selectFrom('obl_contracts as c')
      .innerJoin('obl_offers as o', (join) =>
        join
          .onRef('o.offer_id', '=', 'c.offer_id')
          .onRef('o.version', '=', 'c.offer_version'),
      )
      .selectAll('c')
      .select([
        'o.name as offer_name',
        'o.description as offer_description',
        'o.status as offer_status',
      ])
      .where('c.pair_low', '=', pairLow)
      .where('c.pair_high', '=', pairHigh)
      .orderBy('c.created_at', 'desc')
      .orderBy('c.created_event_seq', 'desc')
      .execute();
  }

  async listInvoicesForPair(
    pairLow: string,
    pairHigh: string,
  ): Promise<OblInvoiceLineView[]> {
    const rows = await this.invoiceLineBaseQuery()
      .where('l.pair_low', '=', pairLow)
      .where('l.pair_high', '=', pairHigh)
      .orderBy('l.created_at', 'desc')
      .orderBy('l.created_event_seq', 'desc')
      .execute();
    return this.mapInvoiceLineRows(rows);
  }

  async listPaymentsForPair(pairLow: string, pairHigh: string): Promise<OblPayment[]> {
    return this.db
      .selectFrom('obl_payments')
      .selectAll()
      .where('pair_low', '=', pairLow)
      .where('pair_high', '=', pairHigh)
      .orderBy('created_at', 'desc')
      .orderBy('created_event_seq', 'desc')
      .execute();
  }

  async listDisputesForInvoices(invoiceIds: string[]): Promise<OblDispute[]> {
    if (invoiceIds.length === 0) {
      return [];
    }
    return this.db
      .selectFrom('obl_disputes')
      .selectAll()
      .where('invoice_id', 'in', invoiceIds)
      .orderBy('created_at', 'desc')
      .orderBy('created_event_seq', 'desc')
      .execute();
  }

  async findOffer(offerId: string, version?: number): Promise<OblOffer | null> {
    let qb = this.db.selectFrom('obl_offers').selectAll().where('offer_id', '=', offerId);
    if (version !== undefined) {
      qb = qb.where('version', '=', version);
    } else {
      qb = qb.orderBy('version', 'desc');
    }
    const row = await qb.executeTakeFirst();
    return row ?? null;
  }

  async findContract(contractId: string): Promise<OblContract | null> {
    const row = await this.db
      .selectFrom('obl_contracts')
      .selectAll()
      .where('contract_id', '=', contractId)
      .executeTakeFirst();
    return row ?? null;
  }

  async findContractWithOffer(
    contractId: string,
  ): Promise<
    (OblContract & { offer_name: string | null; offer_description: string | null }) | null
  > {
    const row = await this.db
      .selectFrom('obl_contracts as c')
      .leftJoin('obl_offers as o', (join) =>
        join
          .onRef('o.offer_id', '=', 'c.offer_id')
          .onRef('o.version', '=', 'c.offer_version'),
      )
      .selectAll('c')
      .select(['o.name as offer_name', 'o.description as offer_description'])
      .where('c.contract_id', '=', contractId)
      .executeTakeFirst();
    return row ?? null;
  }

  async findInvoiceById(invoiceId: string): Promise<OblInvoice | null> {
    const row = await this.db
      .selectFrom('obl_invoices')
      .selectAll()
      .where('invoice_id', '=', invoiceId)
      .executeTakeFirst();
    return row ?? null;
  }

  async listLinesForInvoice(invoiceId: string): Promise<OblObligationLine[]> {
    return this.db
      .selectFrom('obl_obligation_lines')
      .selectAll()
      .where('invoice_id', '=', invoiceId)
      .orderBy('line_id', 'asc')
      .execute();
  }

  async listLinesForInvoices(
    invoiceIds: readonly string[],
  ): Promise<OblObligationLine[]> {
    if (invoiceIds.length === 0) {
      return [];
    }
    return this.db
      .selectFrom('obl_obligation_lines')
      .selectAll()
      .where('invoice_id', 'in', [...invoiceIds])
      .orderBy('invoice_id', 'asc')
      .orderBy('line_id', 'asc')
      .execute();
  }

  async findDisputeById(disputeId: string): Promise<OblDispute | null> {
    const row = await this.db
      .selectFrom('obl_disputes')
      .selectAll()
      .where('dispute_id', '=', disputeId)
      .executeTakeFirst();
    return row ?? null;
  }

  async listCounterpartiesForAccount(account: string): Promise<string[]> {
    const union = this.counterpartyUnionQuery(account).as('counterparties');
    const rows = await this.db
      .selectFrom(union)
      .select('counterparty')
      .distinct()
      .orderBy('counterparty')
      .execute();
    return rows.map((row) => row.counterparty);
  }

  async countContractsForPair(
    pairLow: string,
    pairHigh: string,
    account: string,
  ): Promise<{ total: number; asProvider: number; asClient: number }> {
    const row = await this.db
      .selectFrom('obl_contracts')
      .select([
        sql<number>`count(*)::int`.as('total'),
        sql<number>`count(*) filter (where provider = ${account})::int`.as(
          'as_provider',
        ),
        sql<number>`count(*) filter (where client = ${account})::int`.as('as_client'),
      ])
      .where('pair_low', '=', pairLow)
      .where('pair_high', '=', pairHigh)
      .executeTakeFirst();
    return {
      total: row?.total ?? 0,
      asProvider: row?.as_provider ?? 0,
      asClient: row?.as_client ?? 0,
    };
  }

  async latestContractActivitySeq(
    pairLow: string,
    pairHigh: string,
  ): Promise<bigint | null> {
    const row = await this.db
      .selectFrom('obl_contracts')
      .select('created_event_seq')
      .where('pair_low', '=', pairLow)
      .where('pair_high', '=', pairHigh)
      .orderBy('created_at', 'desc')
      .orderBy('created_event_seq', 'desc')
      .executeTakeFirst();
    return row?.created_event_seq ?? null;
  }

  async findServiceOrderById(serviceOrderId: string): Promise<OblServiceOrder | null> {
    const row = await this.db
      .selectFrom('obl_service_orders')
      .selectAll()
      .where('service_order_id', '=', serviceOrderId)
      .executeTakeFirst();
    return row ?? null;
  }

  async findReportById(reportId: string): Promise<OblReport | null> {
    const row = await this.db
      .selectFrom('obl_reports')
      .selectAll()
      .where('report_id', '=', reportId)
      .executeTakeFirst();
    return row ?? null;
  }

  async listServiceOrdersForPairPaginated(
    pairLow: string,
    pairHigh: string,
    limit: number,
    cursor: string | undefined,
    startedSeq: bigint | null,
  ): Promise<CursorPage<OblServiceOrder>> {
    const decoded = decodeOblCursor(cursor);
    const governingContracts = this.governingContractIdsSubquery(pairLow, pairHigh);
    let qb = this.db
      .selectFrom('obl_service_orders')
      .selectAll()
      .where((eb) =>
        eb.or([
          eb.and([
            eb('pair_low', '=', pairLow),
            eb('pair_high', '=', pairHigh),
          ]),
          eb('contract_id', 'in', governingContracts),
        ]),
      );
    if (startedSeq !== null) {
      qb = qb.where('created_event_seq', '>=', startedSeq);
    }
    if (decoded) {
      qb = qb.where((eb) =>
        eb.or([
          eb('created_event_seq', '<', decoded.seq),
          eb.and([
            eb('created_event_seq', '=', decoded.seq),
            eb('service_order_id', '<', decoded.id),
          ]),
        ]),
      );
    }
    const rows = await qb
      .orderBy('created_at', 'desc')
      .orderBy('created_event_seq', 'desc')
      .orderBy('service_order_id', 'desc')
      .limit(limit + 1)
      .execute();
    return buildCursorPageFromRows(rows, limit, (row) => ({
      seq: row.created_event_seq,
      id: row.service_order_id,
    }));
  }

  async listReportsForPairPaginated(
    pairLow: string,
    pairHigh: string,
    limit: number,
    cursor: string | undefined,
    startedSeq: bigint | null,
  ): Promise<CursorPage<OblReport>> {
    const decoded = decodeOblCursor(cursor);
    const governingContracts = this.governingContractIdsSubquery(pairLow, pairHigh);
    let qb = this.db
      .selectFrom('obl_reports')
      .selectAll()
      .where((eb) =>
        eb.or([
          eb.and([
            eb('pair_low', '=', pairLow),
            eb('pair_high', '=', pairHigh),
          ]),
          eb('contract_id', 'in', governingContracts),
        ]),
      );
    if (startedSeq !== null) {
      qb = qb.where('created_event_seq', '>=', startedSeq);
    }
    if (decoded) {
      qb = qb.where((eb) =>
        eb.or([
          eb('created_event_seq', '<', decoded.seq),
          eb.and([
            eb('created_event_seq', '=', decoded.seq),
            eb('report_id', '<', decoded.id),
          ]),
        ]),
      );
    }
    const rows = await qb
      .orderBy('created_at', 'desc')
      .orderBy('created_event_seq', 'desc')
      .orderBy('report_id', 'desc')
      .limit(limit + 1)
      .execute();
    return buildCursorPageFromRows(rows, limit, (row) => ({
      seq: row.created_event_seq,
      id: row.report_id,
    }));
  }
}

@Injectable()
export class OblOfferDraftsRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async findByAuthorAndDraftId(
    author: string,
    draftId: string,
  ): Promise<OblOfferDraft | null> {
    const row = await this.db
      .selectFrom('obl_offer_drafts')
      .selectAll()
      .where('author', '=', author)
      .where('draft_id', '=', draftId)
      .executeTakeFirst();
    return row ?? null;
  }

  async insert(row: NewOblOfferDraft): Promise<OblOfferDraft> {
    return this.db
      .insertInto('obl_offer_drafts')
      .values({
        ...row,
        fields: sql`${JSON.stringify(jsonForJsonb(row.fields))}::jsonb`,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async updateByAuthorAndDraftId(
    author: string,
    draftId: string,
    patch: OblOfferDraftUpdate,
  ): Promise<OblOfferDraft | null> {
    const { fields, ...scalarPatch } = patch;
    const setValues: Record<string, unknown> = Object.fromEntries(
      Object.entries(scalarPatch).filter(([, v]) => v !== undefined),
    );
    if (fields !== undefined) {
      setValues.fields = sql`${JSON.stringify(jsonForJsonb(fields))}::jsonb`;
    }
    if (Object.keys(setValues).length === 0) {
      return this.findByAuthorAndDraftId(author, draftId);
    }
    const updated = await this.db
      .updateTable('obl_offer_drafts')
      .set(setValues as OblOfferDraftUpdate)
      .where('author', '=', author)
      .where('draft_id', '=', draftId)
      .returningAll()
      .executeTakeFirst();
    return updated ?? null;
  }

  async deleteByAuthorAndDraftId(author: string, draftId: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom('obl_offer_drafts')
      .where('author', '=', author)
      .where('draft_id', '=', draftId)
      .executeTakeFirst();
    return Number(result.numDeletedRows) > 0;
  }

  async listByAuthorPaginated(
    author: string,
    limit: number,
    offset: number,
  ): Promise<OblOfferDraft[]> {
    return this.db
      .selectFrom('obl_offer_drafts')
      .selectAll()
      .where('author', '=', author)
      .orderBy('last_updated', 'desc')
      .orderBy('draft_id', 'desc')
      .limit(limit)
      .offset(offset)
      .execute();
  }

}
