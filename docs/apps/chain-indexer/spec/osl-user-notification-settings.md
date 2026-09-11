---
id: docs-apps-chain-indexer-spec-osl-user-notification-settings
title: OSL update_user_notification_settings
description: Indexes user notification preference toggles into user_notification_settings.
type: spec
status: active
scope: chain-indexer
tags: [chain-indexer, osl, notifications]
updated_at: 2026-07-30
related:
  - docs/apps/chain-indexer/spec/osl-parser.md
  - docs/spec/data-model/users.md
  - docs/apps/notifications/spec/event-catalog.md
---

# OSL `update_user_notification_settings`

**Back:** [OSL parser](osl-parser.md) · **Table:** [user_notification_settings](../../../spec/data-model/users.md)

## Payload (v1)

Strict object (no `account` — PK is `ctx.creator`):

`follow`, `reblog`, `reply`, `mention`, `vote`, `downvote`, `claimed_object_updates`, `group_id_control`, `followed_user_threads`, `transfer`, `fill_order`, `power_up`, `claim_reward`, `witness_vote`, `my_post`, `my_comment`, `my_like`, `minimal_transfer`, `messages` (optional, default `true`), `obl` (optional, default `true`).

Handler: `UserNotificationSettingsHandler` in `apps/chain-indexer/src/domain/osl-parser/handlers/`.

## Persistence

- `UserNotificationSettingsRepository.upsert(account, payload)` — `ON CONFLICT (account) DO UPDATE` on payload columns only; `deactivation_campaign` is unchanged on update and defaults to `true` on insert.
- Requires existing `accounts_current` row (FK); failures are logged and swallowed.

## Caching

None. `apps/notifications` reads settings straight from Postgres in bulk per stream batch, so there is no cache to invalidate — see [notifications transport spec](../../notifications/spec/transport.md).

## Client broadcast

`buildOslUpdateUserNotificationSettingsOp` in `@opden-data-layer/hive-broadcast` with `custom_json.id` = `osl-mainnet` / `osl-testnet`.
