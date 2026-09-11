---
id: chain-indexer-obl-parser
title: OBL parser (chain-indexer)
description: obl-parser module, handlers, HE payment attribution.
type: spec
status: active
scope: chain-indexer
tags: [obl, indexer]
updated_at: 2026-07-14
related:
  - docs/spec/open-business-layer.md
  - docs/apps/chain-indexer/spec/overview.md
---

# OBL parser

Module: `apps/chain-indexer/src/domain/obl-parser/`

## Custom JSON

Registered ids: `obl-mainnet`, `obl-testnet` (see `hive.oblCustomJsonId`). Dispatches via shared `EnvelopeDispatcher` in `odl-shared`.

## Handlers

`offer_publish`, `offer_update`, `offer_retire`, `contract_sign`, `service_order_create`, `report_create`, `invoice_issue`, `payment_declare`, `payment_confirm`, `dispute_open`, `dispute_resolve`.

After a successful persist, handlers emit `obl_*` notifications via `OblNotificationService` — see [OBL lifecycle notifications](../../../spec/obl/notifications.md).

Repository: `OblRepository` (`obl_*` tables).

## Non–custom_json ingestion

| Parser | Path |
|--------|------|
| WAIV transfer | `hive-engine-parser/parsers/obl-token-transfer.parser.ts` |
| Upvote reward | `waiv-post-reward.service.ts` → `OblPaymentAttributionService` |

## Verification

```bash
pnpm nx build chain-indexer
pnpm nx test chain-indexer
```
