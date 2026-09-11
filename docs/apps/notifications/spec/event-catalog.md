---
id: docs-apps-notifications-spec-event-catalog
title: Notification event catalog
description: Non-campaign notification types, wire payloads, and default recipients.
type: spec
status: active
scope: notifications
tags: [notifications, events]
updated_at: 2026-07-31
related:
  - docs/apps/notifications/spec/transport.md
  - docs/apps/notifications/spec/routing.md
---

# Notification event catalog

Source of truth for **types and Zod shapes**: `@opden-data-layer/notifications-contract` (`notificationEventSchema`, `NotificationPayloadMap`).

Campaign types (`campaignReservation`, `activationCampaign`, etc.) are **out of scope** for ODL.

## Envelope (all types)

| Field | Type | Notes |
|-------|------|--------|
| `type` | `NotificationEventType` | Discriminator |
| `occurredAt` | ISO string | From block time |
| `blockNum` | number | Hive block |
| `trxId` | string \| null | Hive transaction id |
| `objectId` | string \| null | ODL object when relevant |
| `actor` | string \| null | Primary actor account |
| `payload` | per-type object | See below |

## Social / content

| Type | Payload highlights | Typical recipients |
|------|-------------------|-------------------|
| `reply` | `author`, `permlink`, `parentAuthor`, `parentPermlink`, `isRootPost` | Parent post/comment author |
| `mention` | `author`, `permlink`, `isRootPost`, `mentioned` | Mentioned account |
| `my_post` / `my_comment` | author, permlink, title (post) | Author (self) |
| `vote_like` | voter, author, permlink, weight, title, likesCount (other active upvotes, excluding current voter) | Content author |
| `vote_downvote` | voter, author, permlink, weight | Content author |
| `my_vote` | voter, author, permlink, title | Voter (self) |
| `reblog` | account, author, permlink | Post author |
| `follow` | following, action | `following` when action is follow |

Bell types (`bell_post`, `bell_reblog`, …) are emitted from **chain-indexer** for root posts and reblogs (`bell_post`, `bell_reblog`). `bell_follow`, `bell_object_post`, `bell_thread`, and `thread_author_follower` are routed when producers emit them; ODL bell-follow actions are not fully wired yet.

## Wallet (Hive L1)

Notify-only handlers in **chain-indexer** `domain/hive-wallet/` (no Postgres wallet history).

| Type | Notes |
|------|--------|
| `transfer_in` / `transfer_out` | Both sides of `transfer`; self-transfer (`from === to`, case-insensitive) emits/routes **inbound only** (`transfer_in`) |
| `transfer_from_savings` | Savings withdrawal |
| `power_up` / `power_down` | Vest flows |
| `claim_reward` | `claim_reward_balance` |
| `witness_vote` | Approve / unapprove |
| `fill_order` | Market fill |
| `withdraw_route` | Withdraw route change |
| `change_recovery_account` | Recovery account change |
| `change_password` | `account_update` with `owner` key present |
| `hp_delegation` | `delegate_vesting_shares`; `amount: '0'` = undelegation | `delegatee` when delegating; `delegator` when `amount === '0'` |

## Wallet (Hive Engine)

Emitted from **hive-engine-parser** (`EngineTokenTransferParser`, `MarketpoolsSwapParser`, `WaivStakeParser` for stake/delegate): `engine_transfer`, `engine_transfer_out`, `engine_swap`, `engine_stake`, `engine_unstake`, `engine_cancel_unstake`, `engine_delegate`, `engine_undelegate`.

| Type | Payload highlights | Typical recipients |
|------|-------------------|-------------------|
| `engine_transfer` | All HE token inbound transfer (incl. `hivepegged/buy` deposits) | `payload.to` |
| `engine_transfer_out` | All HE token outbound transfer; skipped when `from === to` (self-send) | `payload.from` |
| `engine_swap` | Atomic `marketpools/swapTokens` | `payload.account` |
| `engine_stake` | WAIV power up (stake) | `payload.to` |
| `engine_unstake` | WAIV power down initiation (`unstakeStart` or payload fallback) | `payload.account` (initiator) |
| `engine_delegate` | WAIV delegation to account | `payload.to` (delegatee) |
| `engine_undelegate` | WAIV undelegation flow | `actor` (transaction sender) |

## Objects (ODL)

| Type | Notes |
|------|--------|
| `object_update` | Replaces legacy `objectUpdates` / group id via `updateType` |
| `object_status_change` | Status field updates |
| `object_update_reject` | Negative validity vote (`against`) |
| `update_vote_cast` | Positive validity vote (`for`); payload includes `updateId`, `updateType`, `authorPermlink`, `objectName`; links to `/object/:objectId/updates/:updateId` |
| `object_created` | Deprecated; router no-op |

**Deploy order (`update_vote_cast` payload extension):** deploy **chain-indexer** first, then **notifications** (schema accepts legacy `{ updateId, vote }` during rollout), then **web** / **query-api**.

For `object_update`, `object_update_reject`, `object_status_change`, and `update_vote_cast`, **chain-indexer** fills `payload.objectName` in the notification adapter by resolving the winning `update_type = name` (locale `en-US`, same object-resolution pipeline as query-api). Handlers emit `objectName: null`; if resolution fails, the field stays `null` and the web message builder falls back to `authorPermlink`. The resolved name is **snapshotted** at publish time (renames do not rewrite items already in the Redis feed).

## Service

| Type | Feed | Notes |
|------|------|--------|
| `batch_import_completed` | Yes | IPFS batch import |
| `trx_processed` | No | WebSocket subscribers only |

## OSL messaging

Emitted from **chain-indexer** `MessageCreateHandler` after `message_create` is persisted. See [OSL messaging notifications](../../../spec/osl/notifications.md).

| Type | Payload highlights | Typical recipients |
|------|-------------------|-------------------|
| `message_direct` | `channelId`, `messageId`, `author`, `encrypted` | Other DM channel members |
| `message_group` | above + `channelTitle` | Other group channel members |
| `bell_object_message` | above; adapter adds `objectName` when resolvable | Object bell followers |

Message text is **never** included in the payload.

## OBL (Open Business Layer)

Emitted from **chain-indexer** OBL handlers after a successful persist. See [OBL lifecycle notifications](../../../spec/obl/notifications.md).

| Type | Payload highlights | Typical recipients |
|------|-------------------|-------------------|
| `obl_offer_publish` / `obl_offer_update` | `offerId`, `version`, `kind`, `name`, `author`, `arbiter` | Author + arbiter |
| `obl_offer_retire` | `offerId`, `version`, `kind`, `name`, `author` | Author |
| `obl_contract_sign` | `contractId`, `offerId`, `provider`, `client`, `signer` | Provider and client |
| `obl_service_order_create` | `serviceOrderId`, `contractId`, `creator`, `provider`, `client` | Contract parties |
| `obl_report_create` | `reportId`, `contractId`, `author`, `provider`, `client` | Contract parties |
| `obl_invoice_issue` | `invoiceId`, `issuer`, `debtor`, `beneficiaries`, `amountUsd`, `contractId` | Issuer, debtor, beneficiaries |
| `obl_payment_declare` / `obl_payment_confirm` | `paymentId`, `payer`, `receiver`, `amountUsd`, `state` | Payer and receiver |
| `obl_dispute_open` / `obl_dispute_resolve` | `disputeId`, `invoiceId`, `disputant`, `resolver`, `debtor`, `beneficiaries`, `amountUsd` | Invoice parties + resolver |

`objectId` is always `null`. Self-actions (`issuer === debtor`) notify once.

## Settings gating

`apps/notifications` maps each type to a column on `user_notification_settings` and applies `minimal_transfer` (USD) for inbound transfers via `@opden-data-layer/currency`. If USD rates are unavailable, transfer notifications are **not** dropped.

| Column | Event types | Rule |
|--------|-------------|------|
| `vote` | `vote_like` | `false` → block |
| `downvote` | `vote_downvote` | `false` → block |
| `follow`, `reply`, `mention`, `reblog` | matching social types | `false` → block |
| `my_post`, `my_comment`, `my_like` | `my_post`, `my_comment`, `my_vote` | `false` → block |
| `transfer` | inbound/outbound transfer family (incl. `engine_transfer`, `engine_transfer_out`) | `false` → block; inbound also checks `minimal_transfer` |
| `fill_order`, `power_up`, `claim_reward`, `witness_vote` | matching wallet types (incl. `engine_swap` under `fill_order`) | `false` → block |
| `claimed_object_updates` | `object_update`, `object_update_reject`, `update_vote_cast` | `false` → block |
| `group_id_control` | `object_update`, `object_update_reject` | when `payload.updateType === productGroupId`, `false` → block |
| `followed_user_threads` | `bell_thread`, `thread_author_follower` | `false` → block |
| `messages` | `message_direct`, `message_group` | `false` → block |
| `obl` | all `obl_*` types | `false` → block |

`bell_object_message` is **not** gated by `messages` (object bell only). `object_status_change` is **not** gated by user settings (column removed in migration `00050`).

Settings are read from Postgres in bulk per stream batch and are not cached. Accounts that are not registered ODL users receive nothing; registered accounts without a row use `DEFAULT_NOTIFICATION_SETTINGS` — see [transport spec](transport.md).
