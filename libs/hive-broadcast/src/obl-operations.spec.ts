import {
  buildOblOfferPublishOp,
  buildOblOfferUpdateOp,
  buildOblOfferRetireOp,
  buildOblContractSignOp,
  buildOblInvoiceIssueOp,
  buildOblInvoiceIssueBeneficiariesOp,
  buildOblPaymentDeclareOp,
  buildOblPaymentConfirmOp,
  buildOblDisputeOpenOp,
  buildOblDisputeResolveOp,
  buildOblServiceOrderCreateOp,
  buildOblServiceOrderCancelOp,
  buildOblReportCreateOp,
} from './obl-operations';

describe('obl-operations', () => {
  it('buildOblOfferPublishOp uses obl-mainnet id and offer_publish action', () => {
    const op = buildOblOfferPublishOp({
      id: 'obl-mainnet',
      offerId: 'offer-1',
      author: 'alice',
      kind: 'offer',
      name: 'API access',
      terms: { price: 10 },
      disputeRule: 'client',
    });
    expect(op.id).toBe('obl-mainnet');
    const envelope = JSON.parse(op.json) as {
      events: Array<{ action: string; payload: Record<string, unknown> }>;
    };
    expect(envelope.events[0].action).toBe('offer_publish');
    expect(envelope.events[0].payload['offer_id']).toBe('offer-1');
  });

  it('omits empty service_ref and legal_ref from offer_publish payload', () => {
    const op = buildOblOfferPublishOp({
      id: 'obl-mainnet',
      offerId: 'offer-1',
      author: 'alice',
      kind: 'offer',
      name: 'API access',
      serviceRef: '',
      legalRef: '   ',
      terms: { price: 10 },
      disputeRule: 'client',
    });
    const payload = JSON.parse(op.json).events[0].payload as Record<string, unknown>;
    expect(payload).not.toHaveProperty('service_ref');
    expect(payload).not.toHaveProperty('legal_ref');
  });

  it('buildOblContractSignOp signs with counterparty posting auth', () => {
    const op = buildOblContractSignOp({
      id: 'obl-testnet',
      contractId: 'c-1',
      offerId: 'offer-1',
      offerVersion: 1,
      provider: 'alice',
      client: 'bob',
      signer: 'bob',
    });
    expect(op.required_posting_auths).toEqual(['bob']);
  });

  it('buildOblContractSignOp includes metadata when provided', () => {
    const op = buildOblContractSignOp({
      id: 'obl-testnet',
      contractId: 'c-1',
      offerId: 'offer-1',
      offerVersion: 1,
      provider: 'alice',
      client: 'bob',
      signer: 'bob',
      metadata: { targets: ['obj-1'] },
    });
    const payload = JSON.parse(op.json).events[0].payload as Record<string, unknown>;
    expect(payload['metadata']).toEqual({ targets: ['obj-1'] });
  });

  it('buildOblContractSignOp omits metadata when not provided', () => {
    const op = buildOblContractSignOp({
      id: 'obl-testnet',
      contractId: 'c-1',
      offerId: 'offer-1',
      offerVersion: 1,
      provider: 'alice',
      client: 'bob',
      signer: 'bob',
    });
    const payload = JSON.parse(op.json).events[0].payload as Record<string, unknown>;
    expect(payload).not.toHaveProperty('metadata');
  });

  it('buildOblOfferUpdateOp emits offer_update', () => {
    const op = buildOblOfferUpdateOp({
      id: 'obl-mainnet',
      offerId: 'offer-1',
      author: 'alice',
      name: 'Updated',
    });
    const envelope = JSON.parse(op.json) as {
      events: Array<{ action: string }>;
    };
    expect(envelope.events[0].action).toBe('offer_update');
  });

  it('buildOblOfferRetireOp emits offer_retire', () => {
    const op = buildOblOfferRetireOp({
      id: 'obl-mainnet',
      offerId: 'offer-1',
      author: 'alice',
    });
    const envelope = JSON.parse(op.json) as {
      events: Array<{ action: string }>;
    };
    expect(envelope.events[0].action).toBe('offer_retire');
  });

  it('buildOblInvoiceIssueOp emits invoice_issue', () => {
    const op = buildOblInvoiceIssueOp({
      id: 'obl-mainnet',
      invoiceId: 'inv-1',
      issuer: 'alice',
      debtor: 'bob',
      creditor: 'alice',
      amountUsd: 10,
    });
    expect(JSON.parse(op.json).events[0].action).toBe('invoice_issue');
  });

  it('buildOblInvoiceIssueBeneficiariesOp emits beneficiaries invoice_issue', () => {
    const op = buildOblInvoiceIssueBeneficiariesOp({
      id: 'obl-mainnet',
      invoiceId: 'inv-2',
      issuer: 'organizer',
      debtor: 'sponsor',
      contractId: 'c-1',
      beneficiaries: [
        { beneficiary: 'winner', amountUsd: '50' },
        { beneficiary: 'referral', amountUsd: '5', role: 'referral_fee' },
      ],
    });
    const payload = JSON.parse(op.json).events[0].payload as {
      beneficiaries: Array<{ beneficiary: string; amount_usd: string; role?: string }>;
      creditor?: string;
    };
    expect(payload.creditor).toBeUndefined();
    expect(payload.beneficiaries).toHaveLength(2);
    expect(payload.beneficiaries[1].role).toBe('referral_fee');
  });

  it('buildOblPaymentDeclareOp emits payment_declare', () => {
    const op = buildOblPaymentDeclareOp({
      id: 'obl-mainnet',
      paymentId: 'pay-1',
      payer: 'bob',
      receiver: 'alice',
      amountUsd: 5,
    });
    expect(JSON.parse(op.json).events[0].action).toBe('payment_declare');
  });

  it('buildOblPaymentConfirmOp emits payment_confirm', () => {
    const op = buildOblPaymentConfirmOp({
      id: 'obl-mainnet',
      paymentId: 'pay-2',
      receiver: 'alice',
      amountUsd: 5,
    });
    expect(JSON.parse(op.json).events[0].action).toBe('payment_confirm');
  });

  it('buildOblDisputeOpenOp emits dispute_open', () => {
    const op = buildOblDisputeOpenOp({
      id: 'obl-mainnet',
      disputeId: 'd-1',
      invoiceId: 'inv-1',
      disputant: 'bob',
      proposedAmountUsd: 7,
    });
    expect(JSON.parse(op.json).events[0].action).toBe('dispute_open');
  });

  it('buildOblDisputeResolveOp emits dispute_resolve', () => {
    const op = buildOblDisputeResolveOp({
      id: 'obl-mainnet',
      disputeId: 'd-1',
      resolver: 'alice',
      finalAmountUsd: 8,
    });
    expect(JSON.parse(op.json).events[0].action).toBe('dispute_resolve');
  });

  it('buildOblServiceOrderCreateOp emits service_order_create', () => {
    const op = buildOblServiceOrderCreateOp({
      id: 'obl-mainnet',
      serviceOrderId: 'so-1',
      contractId: 'c-1',
      creator: 'alice',
      details: { scope: 'api' },
    });
    const event = JSON.parse(op.json).events[0];
    expect(event.action).toBe('service_order_create');
    expect(event.payload.service_order_id).toBe('so-1');
    expect(op.required_posting_auths).toEqual(['alice']);
  });

  it('buildOblServiceOrderCancelOp signs via posting auths and omits canceller from JSON', () => {
    const op = buildOblServiceOrderCancelOp({
      id: 'obl-mainnet',
      serviceOrderId: 'so-1',
      required_posting_auths: ['alice'],
    });
    const event = JSON.parse(op.json).events[0] as {
      action: string;
      payload: Record<string, unknown>;
    };
    expect(event.action).toBe('service_order_cancel');
    expect(event.payload).toEqual({ service_order_id: 'so-1' });
    expect(event.payload).not.toHaveProperty('canceller');
    expect(op.required_posting_auths).toEqual(['alice']);
  });

  it('buildOblReportCreateOp emits report_create', () => {
    const op = buildOblReportCreateOp({
      id: 'obl-mainnet',
      reportId: 'r-1',
      author: 'bob',
      serviceOrderId: 'so-1',
    });
    const event = JSON.parse(op.json).events[0];
    expect(event.action).toBe('report_create');
    expect(event.payload.report_id).toBe('r-1');
    expect(op.required_posting_auths).toEqual(['bob']);
  });

  it('buildOblInvoiceIssueOp includes optional service_order_id and report_id', () => {
    const op = buildOblInvoiceIssueOp({
      id: 'obl-mainnet',
      invoiceId: 'inv-1',
      issuer: 'alice',
      debtor: 'bob',
      creditor: 'alice',
      amountUsd: 10,
      serviceOrderId: 'so-1',
      reportId: 'r-1',
    });
    const payload = JSON.parse(op.json).events[0].payload as {
      service_order_id?: string;
      report_id?: string;
    };
    expect(payload.service_order_id).toBe('so-1');
    expect(payload.report_id).toBe('r-1');
  });
});
