import {
  buildOblContractSignOp,
  buildOblDisputeOpenOp,
  buildOblDisputeResolveOp,
  buildOblInvoiceIssueOp,
  buildOblInvoiceIssueBeneficiariesOp,
  buildOblOfferPublishOp,
  buildOblOfferRetireOp,
  buildOblOfferUpdateOp,
  buildOblPaymentConfirmOp,
  buildOblPaymentDeclareOp,
  buildOblReportCreateOp,
  buildOblServiceOrderCancelOp,
  buildOblServiceOrderCreateOp,
} from '@opden-data-layer/hive-broadcast';

import { parseOblUsdAmount } from '@opden-data-layer/core/utils/obl-usd-amount';

import type { BeneficiaryLineDraft } from '../domain/invoice-issue';
import { normalizeHiveAccountInput } from '../domain/invoice-issue';
import type { OfferDraftFields } from '../domain/offer-form.types';
import { newOblOfferId } from '../domain/obl-ids';

function requirePositiveUsdAmount(raw: string): string {
  const parsed = parseOblUsdAmount(raw, 'positive');
  if (!parsed) {
    throw new Error('invalid amount_usd');
  }
  return parsed;
}

function requireNonNegativeUsdAmount(raw: string): string {
  const parsed = parseOblUsdAmount(raw, 'nonnegative');
  if (!parsed) {
    throw new Error('invalid amount_usd');
  }
  return parsed;
}

export function buildPublishOfferOp(input: {
  oblCustomJsonId: string;
  author: string;
  kind: 'offer' | 'request';
  fields: OfferDraftFields;
}) {
  const offerId = input.fields.offerId ?? newOblOfferId();
  return buildOblOfferPublishOp({
    id: input.oblCustomJsonId,
    offerId,
    author: input.author,
    kind: input.kind,
    name: input.fields.name ?? 'Untitled',
    description: input.fields.description,
    tags: input.fields.tags,
    serviceRef: input.fields.serviceRef,
    legalRef: input.fields.legalRef,
    terms: input.fields.terms ?? {},
    disputeRule: input.fields.disputeRule ?? 'client',
    arbiter: input.fields.arbiter ?? undefined,
    required_posting_auths: [input.author],
  });
}

export function buildUpdateOfferOp(input: {
  oblCustomJsonId: string;
  author: string;
  offerId: string;
  fields: OfferDraftFields;
}) {
  return buildOblOfferUpdateOp({
    id: input.oblCustomJsonId,
    offerId: input.offerId,
    author: input.author,
    name: input.fields.name,
    description: input.fields.description,
    tags: input.fields.tags,
    serviceRef: input.fields.serviceRef,
    legalRef: input.fields.legalRef,
    terms: input.fields.terms,
    disputeRule: input.fields.disputeRule,
    arbiter: input.fields.arbiter,
    required_posting_auths: [input.author],
  });
}

export function buildRetireOfferOp(input: {
  oblCustomJsonId: string;
  author: string;
  offerId: string;
}) {
  return buildOblOfferRetireOp({
    id: input.oblCustomJsonId,
    offerId: input.offerId,
    author: input.author,
    required_posting_auths: [input.author],
  });
}

export function buildSignContractOp(input: {
  oblCustomJsonId: string;
  contractId: string;
  offerId: string;
  offerVersion: number;
  provider: string;
  client: string;
  signer: string;
  metadata?: Record<string, unknown>;
}) {
  return buildOblContractSignOp({
    id: input.oblCustomJsonId,
    contractId: input.contractId,
    offerId: input.offerId,
    offerVersion: input.offerVersion,
    provider: input.provider,
    client: input.client,
    signer: input.signer,
    metadata: input.metadata,
    required_posting_auths: [input.signer],
  });
}

export function buildIssueInvoiceOp(input: {
  oblCustomJsonId: string;
  invoiceId: string;
  issuer: string;
  debtor: string;
  creditor: string;
  amountUsd: string;
  contractId?: string;
  serviceOrderId?: string;
  reportId?: string;
  details?: Record<string, unknown>;
}) {
  return buildOblInvoiceIssueOp({
    id: input.oblCustomJsonId,
    invoiceId: input.invoiceId,
    issuer: input.issuer,
    debtor: input.debtor,
    creditor: input.creditor,
    amountUsd: requirePositiveUsdAmount(input.amountUsd),
    contractId: input.contractId,
    serviceOrderId: input.serviceOrderId,
    reportId: input.reportId,
    details: input.details,
    required_posting_auths: [input.issuer],
  });
}

export function buildIssueSplitInvoiceOp(input: {
  oblCustomJsonId: string;
  invoiceId: string;
  issuer: string;
  debtor: string;
  beneficiaries: readonly BeneficiaryLineDraft[];
  contractId?: string;
  serviceOrderId?: string;
  reportId?: string;
  details?: Record<string, unknown>;
}) {
  return buildOblInvoiceIssueBeneficiariesOp({
    id: input.oblCustomJsonId,
    invoiceId: input.invoiceId,
    issuer: input.issuer,
    debtor: normalizeHiveAccountInput(input.debtor),
    beneficiaries: input.beneficiaries.map((line) => ({
      beneficiary: normalizeHiveAccountInput(line.beneficiary),
      amountUsd: requirePositiveUsdAmount(line.amountUsd),
      role: line.role?.trim() || undefined,
    })),
    contractId: input.contractId,
    serviceOrderId: input.serviceOrderId,
    reportId: input.reportId,
    details: input.details,
    required_posting_auths: [input.issuer],
  });
}

export function buildDeclarePaymentOp(input: {
  oblCustomJsonId: string;
  paymentId: string;
  payer: string;
  receiver: string;
  amountUsd: string;
  ref?: Record<string, unknown>;
}) {
  return buildOblPaymentDeclareOp({
    id: input.oblCustomJsonId,
    paymentId: input.paymentId,
    payer: input.payer,
    receiver: input.receiver,
    amountUsd: requirePositiveUsdAmount(input.amountUsd),
    ref: input.ref,
    required_posting_auths: [input.payer],
  });
}

export function buildConfirmPaymentOp(input: {
  oblCustomJsonId: string;
  paymentId: string;
  receiver: string;
  amountUsd: string;
  payer?: string;
  declarePaymentId?: string;
  ref?: Record<string, unknown>;
}) {
  return buildOblPaymentConfirmOp({
    id: input.oblCustomJsonId,
    paymentId: input.paymentId,
    receiver: input.receiver,
    amountUsd: requirePositiveUsdAmount(input.amountUsd),
    payer: input.payer,
    declarePaymentId: input.declarePaymentId,
    ref: input.ref,
    required_posting_auths: [input.receiver],
  });
}

export function buildOpenDisputeOp(input: {
  oblCustomJsonId: string;
  disputeId: string;
  invoiceId: string;
  disputant: string;
  proposedAmountUsd: string;
}) {
  return buildOblDisputeOpenOp({
    id: input.oblCustomJsonId,
    disputeId: input.disputeId,
    invoiceId: input.invoiceId,
    disputant: input.disputant,
    proposedAmountUsd: requireNonNegativeUsdAmount(input.proposedAmountUsd),
    required_posting_auths: [input.disputant],
  });
}

export function buildResolveDisputeOp(input: {
  oblCustomJsonId: string;
  disputeId: string;
  resolver: string;
  finalAmountUsd: string;
}) {
  return buildOblDisputeResolveOp({
    id: input.oblCustomJsonId,
    disputeId: input.disputeId,
    resolver: input.resolver,
    finalAmountUsd: requireNonNegativeUsdAmount(input.finalAmountUsd),
    required_posting_auths: [input.resolver],
  });
}

export function buildCreateServiceOrderOp(input: {
  oblCustomJsonId: string;
  serviceOrderId: string;
  contractId: string;
  creator: string;
  details?: Record<string, unknown>;
}) {
  return buildOblServiceOrderCreateOp({
    id: input.oblCustomJsonId,
    serviceOrderId: input.serviceOrderId,
    contractId: input.contractId,
    creator: input.creator,
    details: input.details,
    required_posting_auths: [input.creator],
  });
}

export function buildCancelServiceOrderOp(input: {
  oblCustomJsonId: string;
  serviceOrderId: string;
  username: string;
}) {
  return buildOblServiceOrderCancelOp({
    id: input.oblCustomJsonId,
    serviceOrderId: input.serviceOrderId,
    required_posting_auths: [input.username],
  });
}

export function buildCreateReportOp(input: {
  oblCustomJsonId: string;
  reportId: string;
  author: string;
  contractId?: string;
  serviceOrderId?: string;
  details?: Record<string, unknown>;
}) {
  return buildOblReportCreateOp({
    id: input.oblCustomJsonId,
    reportId: input.reportId,
    author: input.author,
    contractId: input.contractId,
    serviceOrderId: input.serviceOrderId,
    details: input.details,
    required_posting_auths: [input.author],
  });
}
