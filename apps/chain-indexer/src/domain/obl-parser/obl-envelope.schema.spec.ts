import {
  invoiceIssuePayloadSchema,
  paymentDeclarePayloadSchema,
  reportCreatePayloadSchema,
  serviceOrderCancelPayloadSchema,
  serviceOrderCreatePayloadSchema,
} from './obl-envelope.schema';

describe('obl-envelope amount_usd validation', () => {
  it('rejects junk inside invoice amount_usd strings', () => {
    const result = invoiceIssuePayloadSchema.safeParse({
      invoice_id: 'inv-1',
      issuer: 'alice',
      debtor: 'bob',
      creditor: 'alice',
      amount_usd: '1dfdf.5',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid invoice amount_usd strings', () => {
    const result = invoiceIssuePayloadSchema.safeParse({
      invoice_id: 'inv-1',
      issuer: 'alice',
      debtor: 'bob',
      creditor: 'alice',
      amount_usd: '12.5',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount_usd).toBe('12.50000000');
    }
  });

  it('rejects zero payment amounts', () => {
    const result = paymentDeclarePayloadSchema.safeParse({
      payment_id: 'pay-1',
      payer: 'alice',
      receiver: 'bob',
      amount_usd: '0',
    });
    expect(result.success).toBe(false);
  });

  it('accepts beneficiaries array for multi invoice', () => {
    const result = invoiceIssuePayloadSchema.safeParse({
      invoice_id: 'inv-2',
      issuer: 'organizer',
      debtor: 'sponsor',
      contract_id: 'c-1',
      beneficiaries: [
        { beneficiary: 'winner', amount_usd: '5' },
        { beneficiary: 'referral', amount_usd: '1', role: 'referral_fee' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts service_order_create payload', () => {
    const result = serviceOrderCreatePayloadSchema.safeParse({
      service_order_id: 'so-1',
      contract_id: 'c-1',
      creator: 'alice',
    });
    expect(result.success).toBe(true);
  });

  it('accepts service_order_cancel payload without canceller', () => {
    const result = serviceOrderCancelPayloadSchema.safeParse({
      service_order_id: 'so-1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty service_order_id on cancel', () => {
    const result = serviceOrderCancelPayloadSchema.safeParse({
      service_order_id: '',
    });
    expect(result.success).toBe(false);
  });

  it('requires contract_id or service_order_id for report_create', () => {
    const missing = reportCreatePayloadSchema.safeParse({
      report_id: 'r-1',
      author: 'alice',
    });
    expect(missing.success).toBe(false);

    const ok = reportCreatePayloadSchema.safeParse({
      report_id: 'r-1',
      author: 'alice',
      service_order_id: 'so-1',
    });
    expect(ok.success).toBe(true);
  });

  it('accepts optional service_order_id and report_id on invoice issue', () => {
    const result = invoiceIssuePayloadSchema.safeParse({
      invoice_id: 'inv-3',
      issuer: 'alice',
      debtor: 'bob',
      creditor: 'alice',
      amount_usd: '1',
      service_order_id: 'so-1',
      report_id: 'r-1',
    });
    expect(result.success).toBe(true);
  });
});
