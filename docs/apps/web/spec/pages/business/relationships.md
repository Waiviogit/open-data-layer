---
id: web-business-relationships
title: Business — relationships & ledger
description: Counterparty list, balance cards, contract and invoice tabs.
type: spec
status: active
scope: web
tags: [web, business, relationships]
updated_at: 2026-07-24
related:
  - docs/apps/web/spec/pages/business/overview.md
  - docs/spec/obl/mutual-ledger.md
  - docs/spec/obl/service-orders.md
  - docs/spec/obl/reports.md
---

# Business — relationships & ledger

**Back:** [Business overview](overview.md)

## List (`/business/relationships`)

`GET /query/v1/obl/relationships?account=&limit=&offset=` — paginated `{ items, hasMore }`; infinite scroll on the client.

Each row shows the **confirmed** balance summary (`DirectionalUsd`). When confirmed net is settled (zero) but the **pending** bucket is non-zero, a second caption line shows the pending amount and direction (e.g. settled + “Pending: you owe @counterparty $10.00”).

## Detail (`/business/relationships/:account`)

- Balance from `GET /query/v1/obl/balance`; tab lists load from `GET /query/v1/obl/ledger/{payments|contracts|service-orders|reports|invoices|disputes}` with cursor pagination and infinite scroll (only the active tab is fetched initially; other tabs lazy-load on first visit).
- Tabs (default **Payments**): Payments, Contracts, Service orders, Reports, Invoices, Disputes — no Overview tab.
- Tab selection is URL-synced via `?tab=payments|contracts|service-orders|reports|invoices|disputes` (default omits query). Example: `/business/relationships/flowmaster?tab=service-orders`.
- All tab lists are ordered **newest first** by `created_at` (API + client sort).
- Broadcast errors shown below balance cards on all tabs.
- Header actions open modals (no inline forms on tabs):
  - **Create invoice** — `BusinessIssueInvoiceModal`: issuer fixed to viewer; optional governing `contract_id`; optional `service_order_id` / `report_id` text fields; client blocks submit when the typed `service_order_id` matches a loaded cancelled SO; **Simple** / **Split payment** modes (see existing split/attestor rules); optional supporting info via **Object Builder** (`details`).
  - **Create service order** — `BusinessCreateServiceOrderModal`: contract dropdown (signed contracts for the pair), optional `details` via **Object Builder** (prefill from contract `service_order_schema` when present); `service_order_create`.
  - **Create report** — `BusinessCreateReportModal`: optional contract and/or service order id (at least one required on chain), optional `details` via **Object Builder**; `report_create`. Client blocks submit when the typed `service_order_id` matches a loaded cancelled SO.
  - **Record payment** — `BusinessDeclarePaymentModal` (unchanged).
- **Confirm payment**, **Payments tab**, **Dispute invoice** — unchanged (see prior spec text in git history if needed).
- **Contracts tab** — cards with offer name, description (truncated to 300 chars), `contract_id`, `created_at`; link to contract detail.
- **Service orders tab** — cards link to `/business/service-orders/:id`; contract label when known; **Cancel** button (not nested in the link) when the SO is `active` and the viewer is provider or client.
- **Reports tab** — cards link to `/business/reports/:id`; author, contract, optional service order id.
- **Invoices tab** — each row shows linked contract; optional links to service order and report when `service_order_id` / `report_id` present; `invoice_id` links to invoice detail; `created_at`, state badge.
- **Disputes tab** — unchanged.

## Invoice (`/business/invoices/:invoiceId`)

`GET /query/v1/obl/invoices/:invoiceId` — parties, amounts, state, optional contract summary, optional linked service order and report, relationship links.

## Service order (`/business/service-orders/:serviceOrderId`)

`GET /query/v1/obl/service-orders/:serviceOrderId` — parties, contract, `details`, `status`, `cancelled_by` / `cancelled_at` when cancelled, relationship links. Viewer who is a party can **Cancel** an active SO (`service_order_cancel`; signer is posting auth, not a payload field).

## Report (`/business/reports/:reportId`)

`GET /query/v1/obl/reports/:reportId` — author, contract, optional service order, `details`, relationship links.

## Dispute (`/business/disputes/:disputeId`)

`GET /query/v1/obl/disputes/:disputeId` — status, settlement summary, links to invoice and contract.

## Contract (`/business/contracts/:contractId`)

`GET /query/v1/obl/contracts/:contractId` — offer name/description when present, offer link, contract id, provider/client, dispute rule, arbiter (when set), created_at, transaction id, metadata.
