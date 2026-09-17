---
id: docs-apps-chain-indexer-spec-osl-parser
title: Open Social Layer (OSL) parser
description: Hive custom_json envelope parser for social and wallet-adjacent OSL events.
type: spec
status: active
scope: chain-indexer
tags: [chain-indexer, osl, custom-json]
updated_at: 2026-07-28
related:
  - docs/apps/chain-indexer/spec/overview.md
  - docs/apps/chain-indexer/spec/osl-hive-engine-deposit.md
---

# Open Social Layer (OSL) parser

**Back:** [chain-indexer overview](overview.md)

## Purpose

OSL is a Hive `custom_json` envelope layer (same dispatch pattern as ODL/OBL): `{ events: [{ action, v, payload }] }`.

- **custom_json id:** `osl-mainnet` / `osl-testnet` (from `ODL_NETWORK`)
- **Code:** `apps/chain-indexer/src/domain/osl-parser/`

New actions are added as handler classes implementing `OdlActionHandler`; register in `OslCustomJsonParser` handler map.

## Actions

| Action | Spec |
|--------|------|
| `hive_engine_deposit` | [osl-hive-engine-deposit.md](osl-hive-engine-deposit.md) |
| `update_user_notification_settings` | [osl-user-notification-settings.md](osl-user-notification-settings.md) |
| `update_user_metadata` | [osl-user-metadata.md](osl-user-metadata.md) |
| `channel_create`, `message_create`, … | [channels.md](../../spec/osl/channels.md), [messages.md](../../spec/osl/messages.md) |

OSL messaging uses **warn-only** rejects (no persisted reject row). Platform-banned accounts are **not** blocked on the OSL write path (`skipPlatformBannedCheck`).

## Object-channel activity dedup clustering

On **object channels** only, `message_create` may carry `source` (platform id + optional fingerprint). Indexer behavior:

1. **Exact source skip** — if `(channel_id, source.platform, source.id)` already exists, the create is skipped (warn log).
2. **Fingerprint storage** — `text_simhash`, `image_phashes`, `fingerprint_v` parsed from chain; see [activity-fingerprint.md](../../spec/osl/activity-fingerprint.md).
3. **Cluster join** — within ±72h on `COALESCE(original_created_at_unix, created_at_unix)`, near-duplicate candidates (SimHash Hamming ≤ 3 or image pHash ≤ 8, same `fp_v`) share `dup_group_id` (earliest `event_seq` root wins).
4. **Delete promotion** — deleting the cluster root repoints `dup_group_id` to the next survivor; non-root deletes skip promotion.

DM/group channels ignore `source` on insert. Preflight duplicate check: query-api `POST …/channel/activity/dedup-check` and MCP `check_object_activity_duplicate`.
