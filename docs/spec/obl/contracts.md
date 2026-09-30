---
id: obl-contracts
title: OBL contracts lifecycle
description: Offers, contracts, invoices — on-chain actions and tables.
type: spec
status: active
scope: platform
tags: [obl, contracts]
updated_at: 2026-07-24
related:
  - docs/spec/open-business-layer.md
  - docs/spec/obl/service-orders.md
  - docs/spec/obl/reports.md
---

# Contracts lifecycle

## Tables

- `obl_offers` — versioned templates (`PK offer_id, version`); `created_at`
- `obl_contracts` — signed instances (1 offer : many contracts); `created_at`, `metadata` JSONB, optional `service_order_schema` JSONB (snapshot from `offer.terms.serviceOrderSchema` at `contract_sign`)
- `obl_service_orders` — scope/work orders per contract; create + soft-cancel; see [service-orders.md](service-orders.md)
- `obl_reports` — immutable reports linked to contract and/or service order; see [reports.md](reports.md)
- `obl_invoices` — invoice header (`issuer`, `debtor`, `kind`, optional `contract_id`, optional `service_order_id`, optional `report_id`, `details`); `created_at`
- `obl_obligation_lines` — netting source: `(debtor, beneficiary, amount_usd, state, invoice_id, dispute_group, role?)`; pair = `LEAST/GREATEST(debtor, beneficiary)`
- `obl_offer_drafts` — off-chain drafts (query-api only)

## Actions (`obl-mainnet` / `obl-testnet`)

| Action | Signer | Effect |
|--------|--------|--------|
| `offer_publish` | `author` | New offer version |
| `offer_update` | `author` | Append version |
| `offer_retire` | `author` | Mark retired |
| `contract_sign` | counterparty (`signer`) | Create contract; may start ledger. **One contract per `offer_id` + account pair** (deterministic `contract_id`, unique index). Optional `metadata` JSONB. Copies optional `service_order_schema` from the signed offer version’s `terms.serviceOrderSchema`. |
| `service_order_create` | `creator` | Service order for a signed contract; creator must be provider or client. Optional `details`. |
| `service_order_cancel` | posting signer (`required_posting_auths[0]`) | Soft-cancel; either party. Payload is only `service_order_id`. Stores `cancelled_by` from the signer. Existing reports/invoices are not rewritten. New report/invoice with this `service_order_id` is rejected. |
| `report_create` | `author` | Immutable report; at least one of `contract_id` / `service_order_id`; author must be a contract party. Optional `details`. If `service_order_id` points at a cancelled SO the whole report is skipped. |
| `invoice_issue` | `issuer` | Header + obligation line(s). Optional `service_order_id` / `report_id` (informational; indexer nulls invalid refs **except** a cancelled SO: that skips the entire invoice). **Legacy:** `creditor` + `amount_usd` (single line). **Multi:** `beneficiaries[]` with `{ beneficiary, amount_usd, role? }` (2+ lines → `kind=multi`). Attestor invoices (issuer not debtor/beneficiary) require `contract_id` (governing contract with issuer + debtor). Auto-starts ledger per debt pair when authorized by governing contract. |

Typical documentation chain (informational, no extra ledger effect): `contract_sign` → `service_order_create` → `report_create` → `invoice_issue` → payments / disputes.

Invoice line before pair ledger: line `state=pending` until a ledger exists for **that line's** `(debtor, beneficiary)` pair. Promotion to `confirmed` happens when:

1. **Attestor invoice** — auto-starts the debt-pair ledger at issue time (lines become `confirmed` immediately).
2. **Classic single** — `contract_sign` on the contract pair `(provider, client)` starts the ledger and promotes pending lines on the **same** pair (when `debtor`/`creditor` align with contract parties).
3. **Multi-beneficiary** — each line's pair is `(debtor, beneficiary_i)`; `contract_sign` on the governing contract pair does **not** promote lines on other pairs. Those lines need an existing ledger on their debt pair (e.g. attestor auto-start) or stay `pending`.

Dispute resolution authority is read from the invoice header's `contract_id` (governing contract: `dispute_rule`, `arbiter`).

## `contract_sign` payload

- `contract_id` — web uses deterministic id: `contract-{offer_id}-{pair_low}-{pair_high}` (sorted accounts).
- `metadata` (optional) — initialization context (monitoring targets, governance object, etc.). Stored in `obl_contracts.metadata`.

## Offer `terms` extensions (on-chain in `terms` JSONB)

- `terms.termination` — `{ mode: 'instant' | 'notice', who: 'client' | 'provider' | 'both', noticeDays?: number, notes?: string }`
- `terms.signParams` (optional) — `[{ key, label, required? }]` — when set, sign UI renders guided fields that populate `metadata`.
- `terms.serviceOrderSchema` (optional) — JSON Schema object describing recommended `details` for `service_order_create`. Sanitized at `contract_sign` into `obl_contracts.service_order_schema` (not re-read from the offer row later).

## Drafts

`GET/POST/PATCH/DELETE /query/v1/users/:author/obl-drafts` (JWT). Publish via `offer_publish` broadcast, not via query-api.
