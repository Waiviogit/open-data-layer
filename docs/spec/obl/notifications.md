---
id: docs-spec-obl-notifications
title: OBL lifecycle notifications
description: Notification types, recipients, and settings for Open Business Layer custom_json actions.
type: spec
status: active
scope: platform
tags: [obl, notifications]
related:
  - docs/spec/open-business-layer.md
  - docs/apps/notifications/spec/event-catalog.md
  - docs/apps/notifications/spec/routing.md
  - docs/apps/chain-indexer/spec/obl-parser.md
---

# OBL lifecycle notifications

Produced by **chain-indexer** OBL handlers after a successful persist. One event per action (no in/out pair). Recipients are the unique involved Hive accounts, including the actor.

Hive Engine WAIV transfers and upvote rewards that attribute to a Mutual Ledger are **not** emitted here — they already produce `engine_transfer`.

## Event types

| Type | Recipients |
|------|------------|
| `obl_offer_publish` / `obl_offer_update` | `author` + `arbiter?` |
| `obl_offer_retire` | `author` |
| `obl_contract_sign` | `provider`, `client` |
| `obl_service_order_create` | `provider`, `client` |
| `obl_report_create` | `provider`, `client` |
| `obl_invoice_issue` | `issuer`, `debtor`, all `beneficiaries` |
| `obl_payment_declare` / `obl_payment_confirm` | `payer`, `receiver` |
| `obl_dispute_open` | `disputant`, `debtor`, beneficiaries, `resolver` (from governing contract `dispute_rule` / `arbiter`) |
| `obl_dispute_resolve` | `resolver`, `disputant`, `debtor`, beneficiaries |

`objectId` is always `null`. `actor` is the Hive signer. Duplicate accounts (including `issuer === debtor`) collapse case-insensitively to one recipient.

Emit only after the write succeeds. Early-return paths (duplicate invoice, inactive offer, …) do not notify.

## Settings gating

| Column | Types |
|--------|-------|
| `obl` | all `obl_*` types |

Default: `obl = true` (`00063_user_notification_settings_obl`).

## Deploy

Deploy **notifications** (schema + routing + copy) before **chain-indexer**. Unknown stream types are dropped.

## Verification

```bash
pnpm nx test notifications-contract
pnpm nx test notifications-messages
pnpm nx test chain-indexer --testPathPatterns=obl
pnpm nx test notifications --testPathPatterns=recipient-strategies
pnpm nx test notifications --testPathPatterns=notification-settings
```
