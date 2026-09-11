---
id: query-api-user-notification-settings
title: User notification settings endpoint
description: "GET /query/v1/users/:name/notification-settings — read notification toggles for the authenticated viewer."
type: spec
status: active
scope: query-api
tags: [query-api, users, notifications]
related:
  - docs/apps/query-api/spec/overview.md
  - docs/apps/web/spec/pages/notifications/settings.md
updated_at: 2026-07-30
---

# User notification settings

**HTTP:** `GET /query/v1/users/:name/notification-settings`

## Authorization

- Requires `X-Viewer` header matching `:name` (case-insensitive Hive account normalization).
- Returns **403** when viewer is missing or does not match the path account.

## Response

JSON object with boolean toggles and `minimal_transfer` (USD threshold for inbound transfers). Includes `messages` (DM and group message notifications) and `obl` (Open Business Layer lifecycle events). Excludes legacy `deactivation_campaign`.

When no `user_notification_settings` row exists, returns defaults aligned with Mongo migration:

- Most booleans `true`
- `my_post`, `my_comment`, `my_like`, `downvote`, `claim_reward` → `false`
- `minimal_transfer` → `0`
- `messages` → `true`
- `obl` → `true`

## Write path

Settings are **not** updated via query-api. Clients broadcast OSL `update_user_notification_settings` on `osl-mainnet` / `osl-testnet` (see [web settings page](../../web/spec/pages/notifications/settings.md) and [osl-user-notification-settings.md](../../chain-indexer/spec/osl-user-notification-settings.md)).

## MCP

Tool: `get_user_notification_settings` — same `execute()` as HTTP; `viewer` argument required and must match `account`.
