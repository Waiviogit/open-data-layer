import { z } from 'zod';
import { registry } from './registry';
import { queryApiOpenApiTags } from './tags';

const oblOfferSchema = registry.register(
  'OblOffer',
  z.object({
    offer_id: z.string(),
    version: z.number().int(),
    kind: z.enum(['offer', 'request']),
    author: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    tags: z.array(z.string()),
    service_ref: z.string().nullable(),
    legal_ref: z.string().nullable(),
    terms: z.unknown(),
    dispute_rule: z.enum(['client', 'provider', 'arbiter']),
    arbiter: z.string().nullable(),
    status: z.enum(['active', 'retired']),
    created_event_seq: z.string(),
    transaction_id: z.string(),
  }),
);

const pairBalanceSchema = registry.register(
  'OblPairBalance',
  z.object({
    accountA: z.string(),
    accountB: z.string(),
    confirmed: z.object({
      owesAtoB: z.string(),
      owesBtoA: z.string(),
      netUsd: z.string(),
    }),
    pending: z.object({
      owesAtoB: z.string(),
      owesBtoA: z.string(),
      netUsd: z.string(),
    }),
    disputed: z.object({
      owesAtoB: z.string(),
      owesBtoA: z.string(),
      netUsd: z.string(),
    }),
  }),
);

const oblOffsetPageSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    hasMore: z.boolean(),
  });

const oblCursorPageSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  });

const oblPaymentSchema = registry.register(
  'OblPayment',
  z.object({
    payment_id: z.string(),
    payer: z.string(),
    receiver: z.string(),
    amount_usd: z.string(),
    declared_amount_usd: z.string().nullable(),
    state: z.enum(['confirmed', 'pending']),
    ref: z.unknown().nullable(),
    created_event_seq: z.string(),
    created_at: z.string(),
    transaction_id: z.string(),
  }),
);

const oblObligationLineSchema = registry.register(
  'OblObligationLine',
  z.object({
    line_id: z.string(),
    invoice_id: z.string(),
    debtor: z.string(),
    beneficiary: z.string(),
    creditor: z.string(),
    amount_usd: z.string(),
    final_amount_usd: z.string().nullable(),
    state: z.enum(['confirmed', 'pending', 'disputed', 'resolved', 'void']),
    dispute_group: z.string(),
    role: z.string().nullable(),
    created_event_seq: z.string(),
    created_at: z.string(),
    transaction_id: z.string(),
  }),
);

const oblInvoiceSchema = registry.register(
  'OblInvoice',
  z.object({
    invoice_id: z.string(),
    issuer: z.string().optional(),
    debtor: z.string(),
    creditor: z.string().nullable(),
    kind: z.enum(['single', 'multi']).optional(),
    amount_usd: z.string().nullable(),
    final_amount_usd: z.string().nullable(),
    state: z.enum(['confirmed', 'pending', 'disputed', 'resolved', 'void']).nullable(),
    contract_id: z.string().nullable(),
    service_order_id: z.string().nullable().optional(),
    report_id: z.string().nullable().optional(),
    details: z.unknown(),
    line_id: z.string().optional(),
    beneficiary: z.string().optional(),
    role: z.string().nullable().optional(),
    lines: z.array(oblObligationLineSchema).optional(),
    created_event_seq: z.string(),
    created_at: z.string(),
    transaction_id: z.string(),
  }),
);

const oblDisputeSchema = registry.register(
  'OblDispute',
  z.object({
    dispute_id: z.string(),
    invoice_id: z.string(),
    status: z.enum(['open', 'resolved']),
    proposed_amount_usd: z.string(),
    final_amount_usd: z.string().nullable(),
    created_event_seq: z.string(),
    created_at: z.string(),
    transaction_id: z.string(),
  }),
);

const oblContractSchema = registry.register(
  'OblContract',
  z.object({
    contract_id: z.string(),
    offer_id: z.string(),
    offer_version: z.number().int(),
    provider: z.string(),
    client: z.string(),
    dispute_rule: z.enum(['client', 'provider', 'arbiter']),
    arbiter: z.string().nullable(),
    service_order_schema: z.unknown().nullable().optional(),
    created_event_seq: z.string(),
    transaction_id: z.string(),
  }),
);

const oblContractDetailSchema = registry.register(
  'OblContractDetail',
  oblContractSchema.extend({
    metadata: z.unknown(),
    offer_name: z.string().nullable(),
    offer_description: z.string().nullable(),
    created_at: z.string(),
  }),
);

const oblArbitrationRowSchema = registry.register(
  'OblArbitrationRow',
  z.object({
    dispute: oblDisputeSchema.extend({
      disputant: z.string(),
      resolver: z.string().nullable(),
      resolved_event_seq: z.string().nullable(),
    }),
    invoice: oblInvoiceSchema,
    contract: oblContractSchema.extend({
      metadata: z.unknown(),
      created_at: z.string(),
    }),
    offerName: z.string(),
    pair: z.object({
      provider: z.string(),
      client: z.string(),
    }),
  }),
);

const oblContractSummarySchema = registry.register(
  'OblContractSummary',
  oblContractSchema.extend({
    metadata: z.unknown(),
    offer_name: z.string().nullable(),
    offer_description: z.string().nullable(),
    created_at: z.string(),
  }),
);

const oblServiceOrderSchema = registry.register(
  'OblServiceOrder',
  z.object({
    service_order_id: z.string(),
    contract_id: z.string(),
    creator: z.string(),
    provider: z.string(),
    client: z.string(),
    details: z.unknown(),
    status: z.enum(['active', 'cancelled']),
    cancelled_by: z.string().nullable(),
    cancelled_at: z.string().nullable(),
    created_event_seq: z.string(),
    transaction_id: z.string(),
    created_at: z.string(),
  }),
);

const oblReportSchema = registry.register(
  'OblReport',
  z.object({
    report_id: z.string(),
    contract_id: z.string().nullable(),
    service_order_id: z.string().nullable(),
    author: z.string(),
    provider: z.string(),
    client: z.string(),
    details: z.unknown(),
    created_event_seq: z.string(),
    transaction_id: z.string(),
    created_at: z.string(),
  }),
);

const oblServiceOrderDetailSchema = registry.register(
  'OblServiceOrderDetail',
  z.object({
    serviceOrder: oblServiceOrderSchema,
    contract: oblContractSummarySchema.nullable(),
  }),
);

const oblReportDetailSchema = registry.register(
  'OblReportDetail',
  z.object({
    report: oblReportSchema,
    contract: oblContractSummarySchema.nullable(),
    serviceOrder: oblServiceOrderSchema.nullable(),
  }),
);

const oblInvoiceDetailSchema = registry.register(
  'OblInvoiceDetail',
  z.object({
    invoice: oblInvoiceSchema.extend({ issuer: z.string() }),
    contract: oblContractSummarySchema.nullable(),
    serviceOrder: oblServiceOrderSchema.nullable(),
    report: oblReportSchema.nullable(),
  }),
);

const oblDisputeDetailSchema = registry.register(
  'OblDisputeDetail',
  z.object({
    dispute: oblDisputeSchema.extend({
      disputant: z.string(),
      resolver: z.string().nullable(),
      resolved_event_seq: z.string().nullable(),
    }),
    invoice: oblInvoiceSchema.extend({ issuer: z.string() }),
    contract: oblContractSummarySchema.nullable(),
  }),
);

const oblLedgerResponseSchema = registry.register(
  'OblLedgerResponse',
  z.object({
    accountA: z.string(),
    accountB: z.string(),
    startedEventSeq: z.string().nullable(),
    contracts: z.array(oblContractSchema),
    invoices: z.array(oblInvoiceSchema),
    payments: z.array(oblPaymentSchema),
    disputes: z.array(oblDisputeSchema),
    balance: pairBalanceSchema,
  }),
);

const usdToWaivResponseSchema = registry.register(
  'OblUsdToWaivResponse',
  z.object({
    amountUsd: z.number(),
    rateUsd: z.number().nullable(),
    amountWaiv: z.number().nullable(),
  }),
);

const notFoundSchema = z.object({
  statusCode: z.literal(404),
  message: z.string(),
  error: z.string(),
});

const badRequestSchema = z.object({
  statusCode: z.literal(400),
  message: z.union([z.string(), z.array(z.string())]),
  error: z.string(),
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/obl/offers/search',
  tags: [queryApiOpenApiTags.obl],
  summary: 'Search published OBL offers and requests',
  request: {
    query: z.object({
      q: z.string().optional(),
      kind: z.enum(['offer', 'request']).optional(),
      tags: z.string().optional().describe('Comma-separated tags (AND)'),
      author: z.string().optional(),
      status: z
        .enum(['active', 'retired', 'all'])
        .optional()
        .describe('Default active. Use all for owner dashboards (includes retired).'),
      limit: z.coerce.number().int().min(1).max(50).optional(),
      offset: z.coerce.number().int().min(0).optional(),
    }),
  },
  responses: {
    200: {
      description: 'Paginated latest version per offer_id (default status=active)',
      content: {
        'application/json': { schema: oblOffsetPageSchema(oblOfferSchema) },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/obl/offers/{offerId}',
  tags: [queryApiOpenApiTags.obl],
  summary: 'Get one OBL offer by id',
  request: {
    params: z.object({ offerId: z.string() }),
    query: z.object({ version: z.coerce.number().int().positive().optional() }),
  },
  responses: {
    200: {
      description: 'Offer row',
      content: { 'application/json': { schema: oblOfferSchema } },
    },
    404: {
      description: 'Not found',
      content: { 'application/json': { schema: notFoundSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/obl/ledger',
  tags: [queryApiOpenApiTags.obl],
  summary: 'Mutual Ledger drill-down for an account pair',
  request: {
    query: z.object({
      accountA: z.string().min(1).max(32),
      accountB: z.string().min(1).max(32),
    }),
  },
  responses: {
    200: {
      description: 'Contracts, invoices, payments, disputes, and balance',
      content: { 'application/json': { schema: oblLedgerResponseSchema } },
    },
    400: {
      description: 'Invalid pair',
      content: { 'application/json': { schema: badRequestSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/obl/balance',
  tags: [queryApiOpenApiTags.obl],
  summary: 'Per-pair USD balance summary',
  request: {
    query: z.object({
      accountA: z.string().min(1).max(32),
      accountB: z.string().min(1).max(32),
    }),
  },
  responses: {
    200: {
      description: 'Balance buckets',
      content: { 'application/json': { schema: pairBalanceSchema } },
    },
    400: {
      description: 'Invalid pair',
      content: { 'application/json': { schema: badRequestSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/obl/convert/usd-to-waiv',
  tags: [queryApiOpenApiTags.obl],
  summary: 'Convert USD amount to WAIV using stored engine rates',
  request: {
    query: z.object({
      amountUsd: z.coerce.number().positive(),
    }),
  },
  responses: {
    200: {
      description: 'Conversion result',
      content: { 'application/json': { schema: usdToWaivResponseSchema } },
    },
  },
});

const oblRelationshipRowSchema = registry.register(
  'OblRelationshipRow',
  z.object({
    counterparty: z.string(),
    roles: z.array(z.enum(['provider', 'client'])),
    contractCount: z.number().int(),
    balance: pairBalanceSchema,
    lastActivityAt: z.string().nullable(),
    lastActivityEventSeq: z.string().nullable().optional(),
  }),
);

registry.registerPath({
  method: 'get',
  path: '/query/v1/obl/ledger/payments',
  tags: [queryApiOpenApiTags.obl],
  summary: 'Paginated payments for an account pair',
  request: {
    query: z.object({
      accountA: z.string().min(1).max(32),
      accountB: z.string().min(1).max(32),
      limit: z.coerce.number().int().min(1).max(50).optional(),
      cursor: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Cursor page of payments',
      content: {
        'application/json': { schema: oblCursorPageSchema(oblPaymentSchema) },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/obl/ledger/invoices',
  tags: [queryApiOpenApiTags.obl],
  summary: 'Paginated invoices for an account pair',
  request: {
    query: z.object({
      accountA: z.string().min(1).max(32),
      accountB: z.string().min(1).max(32),
      limit: z.coerce.number().int().min(1).max(50).optional(),
      cursor: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Cursor page of invoices',
      content: {
        'application/json': { schema: oblCursorPageSchema(oblInvoiceSchema) },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/obl/ledger/contracts',
  tags: [queryApiOpenApiTags.obl],
  summary: 'Paginated contracts for an account pair',
  request: {
    query: z.object({
      accountA: z.string().min(1).max(32),
      accountB: z.string().min(1).max(32),
      limit: z.coerce.number().int().min(1).max(50).optional(),
      cursor: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Cursor page of contracts',
      content: {
        'application/json': { schema: oblCursorPageSchema(oblContractSchema) },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/obl/ledger/disputes',
  tags: [queryApiOpenApiTags.obl],
  summary: 'Paginated disputes for an account pair',
  request: {
    query: z.object({
      accountA: z.string().min(1).max(32),
      accountB: z.string().min(1).max(32),
      limit: z.coerce.number().int().min(1).max(50).optional(),
      cursor: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Cursor page of disputes',
      content: {
        'application/json': { schema: oblCursorPageSchema(oblDisputeSchema) },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/obl/ledger/service-orders',
  tags: [queryApiOpenApiTags.obl],
  summary: 'Paginated service orders for an account pair',
  request: {
    query: z.object({
      accountA: z.string().min(1).max(32),
      accountB: z.string().min(1).max(32),
      limit: z.coerce.number().int().min(1).max(50).optional(),
      cursor: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Cursor page of service orders',
      content: {
        'application/json': { schema: oblCursorPageSchema(oblServiceOrderSchema) },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/obl/ledger/reports',
  tags: [queryApiOpenApiTags.obl],
  summary: 'Paginated reports for an account pair',
  request: {
    query: z.object({
      accountA: z.string().min(1).max(32),
      accountB: z.string().min(1).max(32),
      limit: z.coerce.number().int().min(1).max(50).optional(),
      cursor: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Cursor page of reports',
      content: {
        'application/json': { schema: oblCursorPageSchema(oblReportSchema) },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/obl/relationships',
  tags: [queryApiOpenApiTags.obl],
  summary: 'List OBL counterparties and per-pair balance for an account',
  request: {
    query: z.object({
      account: z.string().min(1).max(32),
      limit: z.coerce.number().int().min(1).max(50).optional(),
      offset: z.coerce.number().int().min(0).optional(),
    }),
  },
  responses: {
    200: {
      description: 'Paginated relationship rows',
      content: {
        'application/json': { schema: oblOffsetPageSchema(oblRelationshipRowSchema) },
      },
    },
    400: {
      description: 'Invalid account',
      content: { 'application/json': { schema: badRequestSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/obl/arbitration',
  tags: [queryApiOpenApiTags.obl],
  summary: 'List disputes assigned to an arbiter account',
  request: {
    query: z.object({
      account: z.string().min(1).max(32),
      status: z.enum(['open', 'resolved']).optional(),
      limit: z.coerce.number().int().min(1).max(50).optional(),
      cursor: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Cursor page of arbitration dispute rows',
      content: {
        'application/json': { schema: oblCursorPageSchema(oblArbitrationRowSchema) },
      },
    },
    400: {
      description: 'Invalid account',
      content: { 'application/json': { schema: badRequestSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/obl/contracts/{contractId}',
  tags: [queryApiOpenApiTags.obl],
  summary: 'Get one OBL contract by id',
  request: {
    params: z.object({ contractId: z.string() }),
  },
  responses: {
    200: {
      description: 'Contract row with offer summary',
      content: { 'application/json': { schema: oblContractDetailSchema } },
    },
    404: {
      description: 'Not found',
      content: { 'application/json': { schema: notFoundSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/obl/invoices/{invoiceId}',
  tags: [queryApiOpenApiTags.obl],
  summary: 'Get one OBL invoice by id with optional contract summary',
  request: {
    params: z.object({ invoiceId: z.string() }),
  },
  responses: {
    200: {
      description: 'Invoice detail row',
      content: { 'application/json': { schema: oblInvoiceDetailSchema } },
    },
    404: {
      description: 'Not found',
      content: { 'application/json': { schema: notFoundSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/obl/service-orders/{serviceOrderId}',
  tags: [queryApiOpenApiTags.obl],
  summary: 'Get one OBL service order by id',
  request: {
    params: z.object({ serviceOrderId: z.string() }),
  },
  responses: {
    200: {
      description: 'Service order detail row',
      content: { 'application/json': { schema: oblServiceOrderDetailSchema } },
    },
    404: {
      description: 'Not found',
      content: { 'application/json': { schema: notFoundSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/obl/reports/{reportId}',
  tags: [queryApiOpenApiTags.obl],
  summary: 'Get one OBL report by id',
  request: {
    params: z.object({ reportId: z.string() }),
  },
  responses: {
    200: {
      description: 'Report detail row',
      content: { 'application/json': { schema: oblReportDetailSchema } },
    },
    404: {
      description: 'Not found',
      content: { 'application/json': { schema: notFoundSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/obl/disputes/{disputeId}',
  tags: [queryApiOpenApiTags.obl],
  summary: 'Get one OBL dispute by id with linked invoice and contract',
  request: {
    params: z.object({ disputeId: z.string() }),
  },
  responses: {
    200: {
      description: 'Dispute detail row',
      content: { 'application/json': { schema: oblDisputeDetailSchema } },
    },
    404: {
      description: 'Not found',
      content: { 'application/json': { schema: notFoundSchema } },
    },
  },
});
