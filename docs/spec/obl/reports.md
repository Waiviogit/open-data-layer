---
id: obl-reports
title: OBL reports
description: Immutable report_create records linked to contracts or service orders; query-api and web surfaces.
type: spec
status: active
scope: platform
tags: [obl, reports]
updated_at: 2026-07-24
related:
  - docs/spec/obl/service-orders.md
  - docs/spec/obl/contracts.md
---

# OBL reports

Immutable records authored by a contract party. They may link to a **contract**, a **service order**, or both (at least one required on chain). Informational only — no ledger effect.

## On-chain

- **Action:** `report_create`
- **Payload:** `report_id`, `author`, optional `contract_id`, optional `service_order_id`, optional `details`
- **Signer:** `author` in `required_posting_auths`
- **Rules:** At least one of `contract_id` / `service_order_id`; author must be provider or client of the resolved contract; if both ids are set they must agree on contract; if `service_order_id` points at a **cancelled** service order the whole report is skipped

## Storage

Table `obl_reports`. `contract_id` is stored denormalized (from payload or from the linked service order).

## Query API

| Method | Path |
|--------|------|
| GET | `/query/v1/obl/reports/:reportId` |
| GET | `/query/v1/obl/ledger/reports?accountA&accountB` |

## Invoices

`invoice_issue` may include optional `service_order_id` and `report_id`. The indexer validates consistency leniently for missing/mismatched refs (logged and stored as `null`) **except** a cancelled service order: if `service_order_id` is set and that SO is cancelled, the entire invoice is skipped. Already-stored invoices keep their ref after a later cancel.

## Web

Relationship **Reports** tab, **Create report**, detail `/business/reports/:id`. Issue-invoice modal optional link fields.

## Related

- [Service orders](./service-orders.md)
- [Contracts](./contracts.md)
