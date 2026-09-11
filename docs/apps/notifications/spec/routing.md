---
id: docs-apps-notifications-spec-routing
title: Notification routing
description: Recipient resolution strategies in apps/notifications.
type: spec
status: active
scope: notifications
tags: [notifications, routing]
updated_at: 2026-07-30
related:
  - docs/apps/notifications/spec/event-catalog.md
  - docs/apps/notifications/spec/transport.md
---

# Notification routing

`NotificationRouterService.routeBatch` handles a whole stream batch: parse events → **coalesce duplicate `vote_like` per `(author, permlink)`** (keep last in batch order) → pick strategy per event → resolve recipients → load the audience in bulk (`NotificationAudienceService`) → filter in memory with `NotificationSettingsService.isAllowed` → `NotificationFeedService.addManyToFeed` + `TelegramNotificationService.enqueueMany` (except `trx_processed`, which only pushes to WS). `route(event)` is a single-event wrapper over `routeBatch`. Gating semantics and batch mechanics live in [transport.md](transport.md).

## Strategies

Registered in `RecipientStrategyRegistry` (`domain/routing/`):

| Strategy | `supports()` | `resolveRecipients()` |
|----------|--------------|------------------------|
| **Direct** | Wallet L1/engine, follow, batch import | Explicit accounts from payload (`to`, `from`, `following`, …); `transfer_out` / `engine_transfer_out` return no recipients when `from === to` |
| **PostAuthor** | `reply`, `mention`, `vote_like`, `vote_downvote`, `reblog` | Parent/post author from payload |
| **SelfActor** | `my_post`, `my_comment`, `my_vote` | `event.actor` |
| **ObjectAudience** | Object updates, votes, status | Creator + administrative authority + object bell (`user_object_follows.bell`) |
| **UserBell** | `bell_post`, `bell_reblog`, `bell_follow`, `bell_object_post`, `bell_thread` | `user_subscriptions.bell` subscribers or object bell followers |
| **ThreadAuthorFollower** | `thread_author_follower` | `payload.mentions` + account bell subscribers of `payload.author` |
| **ChannelMessaging** | `message_direct`, `message_group`, `bell_object_message` | Channel members minus author (DM/group); object bell followers minus author (`bell_object_message`) |
| **Obl** | `obl_*` | Unique involved accounts from payload (including actor) |

First matching strategy wins. `object_created` is intentionally dropped (use `object_update`). `trx_processed` pushes to WS subscribers for `trxId` only.

See also [OSL messaging notifications](../../../spec/osl/notifications.md).

## Read cursor

`user_metadata.notifications_last_timestamp` updated via WebSocket `mark_read`. `get_notifications` returns `lastReadTimestamp` with the feed.

## Feed storage

Redis list key: `notifications:cache:feed:{username}` (legacy `notifications:list:{username}` merged on read during rollout).
