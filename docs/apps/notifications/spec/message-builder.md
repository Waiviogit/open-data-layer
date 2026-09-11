---
id: docs-apps-notifications-spec-message-builder
title: Notification message builder
description: Shared copy and links for web and future Telegram.
type: spec
status: active
scope: notifications
tags: [notifications, i18n]
updated_at: 2026-07-30
related:
  - docs/apps/notifications/spec/event-catalog.md
---

# Notification message builder

Library: `@opden-data-layer/notifications-messages`.

## API

```ts
buildNotificationMessage(event: AnyNotificationEvent): NotificationMessage
```

`NotificationMessage`:

| Field | Purpose |
|-------|---------|
| `key` | i18n key in `apps/web/src/i18n/locales/*.json` |
| `params` | Placeholders `{username}`, `{amount}`, … |
| `href` | Primary **context** destination: web row overlay + Telegram `Go to website` button |
| `icon` | `follow` \| `vote` \| `reply` \| `wallet` \| `object` \| `bell` \| `generic` |
| `actor` | Avatar / display account |
| `paramHrefs` | Optional map of placeholder name → relative `href` for secondary inline accent links on web (profile, post title, object name) |

Pure functions only — no Nest, React, or i18n runtime.

## Channels

- **Web**: `format-notification.ts` calls `buildNotificationMessage`, then `resolveNotificationContextHref(event, message, viewerUsername)` for the row overlay. `NotificationMessageText` renders i18n templates with `paramHrefs` as secondary accent `Link` segments; avatar links to the actor profile.
- **Telegram**: `renderTelegramBody(message, dict)` for the message body; `resolveNotificationContextHref(event, message, recipientAccount)` then `resolveNotificationAbsoluteUrl` for the website button URL. Messaging types (`message_direct`, `message_group`) resolve to `/@{recipient}/messages?channel={channelId}` when both recipient and `channelId` are present. `renderPlainText` remains for plain-text consumers that append the URL as a second line.

**Dictionary sync:** every i18n key emitted by `buildNotificationMessage` must exist in [`apps/notifications/src/telegram/en-dictionary.ts`](../../../../apps/notifications/src/telegram/en-dictionary.ts) with the same placeholder names as [`apps/web/src/i18n/locales/en-US.json`](../../../../apps/web/src/i18n/locales/en-US.json). `en-dictionary.spec.ts` asserts full coverage and no unfilled `{placeholder}` tokens in rendered Telegram bodies.

`update_vote_cast` uses `notification_update_vote_cast` and `objectUpdatePath(objectId, updateId)` → `/object/:objectId/updates/:updateId` (see [object update detail](../../../web/spec/object-update-detail.md)).

Wallet notifications use `walletTransfersPath(username, tab)` with `?type=WAIV`, `?type=HIVE`, or `?type=ENGINE` (web wallet tab), resolved from payload symbol/amount via `walletTabFromSymbol` / `walletTabFromAmount` — not legacy operation names like `transfer` or `tokens`.

OBL types use `/business/*` and public offer/request version URLs (`oblPublicOfferPath`, `oblContractPath`, `oblInvoicePath`, …). Payment events link to `/business/relationships/:counterparty`.

## Adding a type

1. Extend `NotificationPayloadMap` + `notificationEventSchema` in `notifications-contract`.
2. Add builder branch in the appropriate `builders/*.ts` file.
3. Add unit expectation in `registry.spec.ts`.
4. Add i18n key to all locale JSON files (UTF-8, no BOM).
5. Emit from chain-indexer (or other producer) via `NotificationEmitterService`.
