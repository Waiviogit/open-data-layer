---
id: open-business-layer
title: Open Business Layer (OBL)
description: Normative overview of OBL — catalog, on-chain contracts, Mutual Ledger, USD balances.
type: spec
status: active
scope: platform
tags: [obl, business-layer]
updated_at: 2026-07-24
related:
  - docs/spec/obl/mutual-ledger.md
  - docs/spec/obl/contracts.md
  - docs/spec/obl/payments.md
  - docs/spec/obl/disputes.md
  - docs/spec/obl/service-orders.md
  - docs/spec/obl/reports.md
  - docs/apps/chain-indexer/spec/obl-parser.md
  - docs/apps/query-api/spec/obl.md
  - docs/spec/obl/notifications.md
---

# Open Business Layer (OBL)

Waivio indexes OBL on-chain history and computes per-pair **Mutual Ledger** balances in USD. Waivio is **not** escrow, settlement agent, or default arbitrator.

## Two discovery paths

1. **ODL catalog** — collaborative `service_offered` / `service_requested` / `legal_document` objects under `odl-mainnet` (discover/search unchanged).
2. **Published offers** — `obl_offers` rows with own `name` / `description` / `tags` (search via query-api). `service_ref` is optional.

## Lifecycle

`draft` (off-chain, query-api) → `offer_publish` → `contract_sign` → optional `service_order_create` / `report_create` → `invoice_issue` → payments / disputes.

On-chain actions include: `offer_publish`, `offer_update`, `offer_retire`, `contract_sign`, `service_order_create`, `report_create`, `invoice_issue`, `payment_declare`, `payment_confirm`, `dispute_open`, `dispute_resolve` (see [chain-indexer obl-parser](../apps/chain-indexer/spec/obl-parser.md)).

Drafts are editable off-chain (`obl_offer_drafts`). Publishing freezes a version on-chain.

## Custom JSON ids

| Network | Id |
|---------|-----|
| Mainnet | `obl-mainnet` |
| Testnet | `obl-testnet` |

Catalog ODL objects remain on `odl-mainnet` / `odl-testnet`.

## Feature specs

| Doc | Topic |
|-----|--------|
| [mutual-ledger.md](obl/mutual-ledger.md) | Per-pair USD balance, states, cutoff |
| [contracts.md](obl/contracts.md) | Offers, contracts, invoices |
| [payments.md](obl/payments.md) | On-chain WAIV, upvote rewards, off-chain |
| [disputes.md](obl/disputes.md) | Dispute open/resolve rules |
| [service-orders.md](obl/service-orders.md) | Immutable service orders |
| [reports.md](obl/reports.md) | Immutable reports |
| [notifications.md](obl/notifications.md) | Lifecycle notifications for OBL actions |

## App specs

| App | Doc |
|-----|-----|
| chain-indexer | [obl-parser.md](../apps/chain-indexer/spec/obl-parser.md) |
| query-api | [obl.md](../apps/query-api/spec/obl.md) |
