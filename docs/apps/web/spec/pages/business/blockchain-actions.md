---
id: web-business-blockchain-actions
title: Business — blockchain action UX
description: Wallet broadcast, indexing wait, and revalidation for OBL custom_json.
type: spec
status: active
scope: web
tags: [web, business, blockchain]
updated_at: 2026-07-24
related:
  - docs/apps/web/spec/pages/business/overview.md
---

# Business — blockchain action UX

**Back:** [Business overview](overview.md)

## Flow

`useOblBroadcast`: wallet → broadcast → `awaitTrxConfirmation` → `revalidateOblAfterBroadcast` (tags: offers, ledger, relationships; optional `contractId`, `invoiceId`, `disputeId`, `serviceOrderId`, `reportId`).

## Custom JSON id

Client broadcasts use `useOblCustomJsonId()` from `OdlNetworkProvider` (server env `oblCustomJsonId`).

## Phases (`blockchain-action.ts`)

`drafting` → `wallet` → `broadcast` → `indexing` → `confirmed` | `failed`. UI surfaces indexing via `StateBadge` variant `indexing`.

`isOblBroadcastBusy(phase)` is true for `wallet`, `broadcast`, and `indexing`. Primary actions (Sign contract, Publish version, Retire offer, relationship modal submits, header ledger actions) are **disabled** while busy. Modals use `closeOnBackdrop={!isBusy}`.

## Builders

`application/build-obl-ops.ts` wraps `@opden-data-layer/hive-broadcast` for publish, update, retire, sign (with optional `metadata`), invoice (optional `details`, `contractId`, `serviceOrderId`, `reportId`), service order create / cancel (`buildCancelServiceOrderOp` / `service_order_cancel`; signer is posting auth only), report create, payment declare/confirm (confirm supports `declarePaymentId` and partial amount), dispute open/resolve.

Relationship modals:

| Modal | Op |
|-------|-----|
| Issue invoice | `buildIssueInvoiceOp` / `buildIssueSplitInvoiceOp` |
| Create service order | `buildCreateServiceOrderOp` |
| Create report | `buildCreateReportOp` |
| Record payment | `buildDeclarePaymentOp` |
| Confirm payment | `buildConfirmPaymentOp` + `declarePaymentId` |
| Open dispute | `buildOpenDisputeOp` |

Optional `metadata` (contract sign), `details` (invoice, service order, report), and payment `ref` are edited in the UI with **`ObjectBuilder`** (`presentation/components/object-builder/`) — typed key/value rows, one nested object level, scalar arrays, validation (duplicate keys, dangerous keys, limits). Replaces raw JSON textareas.
