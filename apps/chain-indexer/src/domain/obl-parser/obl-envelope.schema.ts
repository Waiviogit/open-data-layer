import { z } from 'zod';

import {
  oblNonNegativeUsdAmountSchema,
  oblPositiveUsdAmountSchema,
} from './obl-usd.schema';

export const OBL_DISPUTE_RULES = ['client', 'provider', 'arbiter'] as const;
export const OBL_OFFER_KINDS = ['offer', 'request'] as const;

const tagsSchema = z.array(z.string().min(1).max(64)).max(32).default([]);

export const offerPublishPayloadSchema = z.object({
  offer_id: z.string().min(1).max(256),
  author: z.string().min(1).max(32),
  kind: z.enum(OBL_OFFER_KINDS),
  name: z.string().min(1).max(256),
  description: z.string().max(4096).optional(),
  tags: tagsSchema.optional(),
  service_ref: z.string().min(1).max(256).optional(),
  legal_ref: z.string().min(1).max(256).optional(),
  terms: z.record(z.string(), z.unknown()),
  dispute_rule: z.enum(OBL_DISPUTE_RULES),
  arbiter: z.string().min(1).max(32).optional(),
});

export const offerUpdatePayloadSchema = z.object({
  offer_id: z.string().min(1).max(256),
  author: z.string().min(1).max(32),
  name: z.string().min(1).max(256).optional(),
  description: z.string().max(4096).optional(),
  tags: tagsSchema.optional(),
  service_ref: z.string().min(1).max(256).nullable().optional(),
  legal_ref: z.string().min(1).max(256).nullable().optional(),
  terms: z.record(z.string(), z.unknown()).optional(),
  dispute_rule: z.enum(OBL_DISPUTE_RULES).optional(),
  arbiter: z.string().min(1).max(32).nullable().optional(),
});

export const offerRetirePayloadSchema = z.object({
  offer_id: z.string().min(1).max(256),
  author: z.string().min(1).max(32),
});

export const contractSignPayloadSchema = z.object({
  contract_id: z.string().min(1).max(256),
  offer_id: z.string().min(1).max(256),
  offer_version: z.number().int().positive(),
  provider: z.string().min(1).max(32),
  client: z.string().min(1).max(32),
  signer: z.string().min(1).max(32),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const beneficiaryLineSchema = z.object({
  beneficiary: z.string().min(1).max(32),
  amount_usd: oblPositiveUsdAmountSchema,
  role: z.string().min(1).max(64).optional(),
});

export const invoiceIssuePayloadSchema = z
  .object({
    invoice_id: z.string().min(1).max(256),
    issuer: z.string().min(1).max(32),
    debtor: z.string().min(1).max(32),
    creditor: z.string().min(1).max(32).optional(),
    amount_usd: oblPositiveUsdAmountSchema.optional(),
    beneficiaries: z.array(beneficiaryLineSchema).min(1).optional(),
    contract_id: z.string().min(1).max(256).optional(),
    service_order_id: z.string().min(1).max(256).optional(),
    report_id: z.string().min(1).max(256).optional(),
    details: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((data, ctx) => {
    const hasLegacy = data.creditor !== undefined && data.amount_usd !== undefined;
    const hasBeneficiaries =
      data.beneficiaries !== undefined && data.beneficiaries.length > 0;
    if (hasLegacy === hasBeneficiaries) {
      ctx.addIssue({
        code: 'custom',
        message: 'invoice_issue: provide either creditor+amount_usd or beneficiaries',
      });
    }
  });

export const paymentDeclarePayloadSchema = z.object({
  payment_id: z.string().min(1).max(256),
  payer: z.string().min(1).max(32),
  receiver: z.string().min(1).max(32),
  amount_usd: oblPositiveUsdAmountSchema,
  ref: z.record(z.string(), z.unknown()).optional(),
});

export const paymentConfirmPayloadSchema = z.object({
  payment_id: z.string().min(1).max(256),
  receiver: z.string().min(1).max(32),
  payer: z.string().min(1).max(32).optional(),
  amount_usd: oblPositiveUsdAmountSchema,
  declare_payment_id: z.string().min(1).max(256).optional(),
  ref: z.record(z.string(), z.unknown()).optional(),
});

export const disputeOpenPayloadSchema = z.object({
  dispute_id: z.string().min(1).max(256),
  invoice_id: z.string().min(1).max(256),
  disputant: z.string().min(1).max(32),
  proposed_amount_usd: oblNonNegativeUsdAmountSchema,
});

export const disputeResolvePayloadSchema = z.object({
  dispute_id: z.string().min(1).max(256),
  resolver: z.string().min(1).max(32),
  final_amount_usd: oblNonNegativeUsdAmountSchema,
});

export const serviceOrderCreatePayloadSchema = z.object({
  service_order_id: z.string().min(1).max(256),
  contract_id: z.string().min(1).max(256),
  creator: z.string().min(1).max(32),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const serviceOrderCancelPayloadSchema = z.object({
  service_order_id: z.string().min(1).max(256),
});

export const reportCreatePayloadSchema = z
  .object({
    report_id: z.string().min(1).max(256),
    author: z.string().min(1).max(32),
    contract_id: z.string().min(1).max(256).optional(),
    service_order_id: z.string().min(1).max(256).optional(),
    details: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((data, ctx) => {
    const hasContract = data.contract_id !== undefined && data.contract_id.length > 0;
    const hasServiceOrder =
      data.service_order_id !== undefined && data.service_order_id.length > 0;
    if (!hasContract && !hasServiceOrder) {
      ctx.addIssue({
        code: 'custom',
        message: 'report_create: provide contract_id and/or service_order_id',
      });
    }
  });

const oblEventSchema = z.object({
  action: z.enum([
    'offer_publish',
    'offer_update',
    'offer_retire',
    'contract_sign',
    'invoice_issue',
    'payment_declare',
    'payment_confirm',
    'dispute_open',
    'dispute_resolve',
    'service_order_create',
    'service_order_cancel',
    'report_create',
  ]),
  v: z.number().int().min(1),
  event_id: z.string().uuid().optional(),
  payload: z.record(z.string(), z.unknown()),
});

export const oblEnvelopeSchema = z.object({
  events: z.array(oblEventSchema).min(1),
});

export type OblEnvelope = z.infer<typeof oblEnvelopeSchema>;
