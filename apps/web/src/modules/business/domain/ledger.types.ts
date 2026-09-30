export type DirectionalUsdView = {
  owesAtoB: string;
  owesBtoA: string;
  netUsd: string;
};

export type PairBalanceView = {
  accountA: string;
  accountB: string;
  confirmed: DirectionalUsdView;
  pending: DirectionalUsdView;
  disputed: DirectionalUsdView;
};

export type OblOfferSummary = {
  offerId: string;
  version: number;
  kind: 'offer' | 'request';
  author: string;
  name: string;
  description: string | null;
  tags: string[];
  status: 'active' | 'retired';
  disputeRule: 'client' | 'provider' | 'arbiter';
  arbiter: string | null;
};

export type OblLedgerView = {
  accountA: string;
  accountB: string;
  startedEventSeq: string | null;
  balance: PairBalanceView;
  contractCount: number;
  invoiceCount: number;
  paymentCount: number;
  disputeCount: number;
};

export type OblRelationshipRow = {
  counterparty: string;
  roles: Array<'provider' | 'client'>;
  contractCount: number;
  balance: PairBalanceView;
  lastActivityAt: string | null;
};

export type LedgerInvoiceRow = {
  invoice_id: string;
  contract_id: string | null;
  service_order_id?: string | null;
  report_id?: string | null;
  debtor: string;
  creditor: string;
  beneficiary?: string;
  issuer: string;
  amount_usd: string;
  final_amount_usd?: string | null;
  kind?: 'single' | 'multi';
  state: 'confirmed' | 'pending' | 'disputed' | 'resolved' | 'void';
  role?: string | null;
  details?: Record<string, unknown>;
  created_at: string;
};

export type LedgerPaymentRow = {
  payment_id: string;
  payer: string;
  receiver: string;
  amount_usd: string;
  declared_amount_usd?: string | null;
  state: 'pending' | 'confirmed';
  method: string;
  ref?: Record<string, unknown> | null;
  created_at: string;
};

export type LedgerDisputeRow = {
  dispute_id: string;
  invoice_id: string;
  disputant: string;
  proposed_amount_usd: string;
  final_amount_usd?: string | null;
  resolver?: string | null;
  status: 'open' | 'resolved';
  created_at: string;
};

export type LedgerContractRow = {
  contract_id: string;
  offer_id: string;
  offer_version: number;
  provider: string;
  client: string;
  dispute_rule: 'client' | 'provider' | 'arbiter';
  arbiter: string | null;
  offer_name: string;
  offer_description: string | null;
  offer_status?: 'active' | 'retired';
  service_order_schema: Record<string, unknown> | null;
  created_at: string;
};

export type LedgerServiceOrderRow = {
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

export type LedgerReportRow = {
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
