---
id: obl-service-orders
title: OBL service orders
description: service_order_create / service_order_cancel lifecycle, contract-linked details, optional schema prefill on web.
type: spec
status: active
scope: platform
tags: [obl, service-orders]
updated_at: 2026-09-30
related:
  - docs/spec/obl/contracts.md
  - docs/spec/obl/reports.md
---

# OBL service orders

Records that reference a **signed contract** between provider and client. They do not move balances; they document work or scope before invoices and reports. Create is append-only; cancel is a soft status.

## On-chain

### `service_order_create`

- **Payload:** `service_order_id`, `contract_id`, `creator`, optional `details` (JSON object)
- **Signer:** `creator` must be in `required_posting_auths`
- **Rules:** `creator` must be the contract `provider` or `client`

### `service_order_cancel`

- **Payload:** `{ service_order_id }` only — no actor name in JSON
- **Signer:** Hive `required_posting_auths[0]` (fallback `required_auths[0]`) is the canceller
- **Rules:** signer must be the stored `provider` or `client`; already cancelled is a no-op
- **Persist:** `status=cancelled`, `cancelled_by` = signer, `cancelled_at` = block time, plus event seq / tx id
- Cancel is allowed even when reports or invoices already reference the SO. Those rows are **not** rewritten.

### New docs after cancel

`report_create` / `invoice_issue` that include a `service_order_id` whose SO is cancelled are **skipped entirely** (invoice is not stored with a nulled ref). Documents that omit `service_order_id` are unchanged.

## Storage

Table `obl_service_orders` (migrations `00045_obl_service_orders_reports.ts`, `00067_obl_service_order_cancel.ts`). Denormalized `provider` / `client` and generated `pair_low` / `pair_high` for pair-scoped listing. `status` is `active` | `cancelled`.

## Query API

| Method | Path |
|--------|------|
| GET | `/query/v1/obl/service-orders/:serviceOrderId` |
| GET | `/query/v1/obl/ledger/service-orders?accountA&accountB` |

Serialized rows include `status`, `cancelled_by`, `cancelled_at`.

## Web

Relationship tab **Service orders**: cards link to `/business/service-orders/:id` and expose a separate **Cancel** action for an active SO when the viewer is a party. Detail page repeats Cancel and shows who cancelled.

## Related

- [Contracts](./contracts.md)
- [Reports](./reports.md)
- [Relationships](./relationships.md)
