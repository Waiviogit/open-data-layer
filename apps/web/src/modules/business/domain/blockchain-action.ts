export type BlockchainActionPhase =
  | 'drafting'
  | 'review'
  | 'wallet'
  | 'broadcast'
  | 'indexing'
  | 'confirmed'
  | 'failed';

export type BlockchainActionKind =
  | 'offer_publish'
  | 'offer_update'
  | 'offer_retire'
  | 'contract_sign'
  | 'invoice_issue'
  | 'payment_declare'
  | 'payment_confirm'
  | 'dispute_open'
  | 'dispute_resolve'
  | 'service_order_create'
  | 'service_order_cancel';

export function isOblBroadcastBusy(phase: BlockchainActionPhase): boolean {
  return phase === 'wallet' || phase === 'broadcast' || phase === 'indexing';
}
