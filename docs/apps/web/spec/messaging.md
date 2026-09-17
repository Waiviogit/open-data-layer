---
id: docs-apps-web-spec-messaging
title: Web messaging UI
description: Profile inbox and object channel chat in apps/web.
type: spec
status: active
scope: web
tags: [web, messaging]
related:
  - docs/apps/query-api/spec/osl-messaging.md
  - docs/spec/osl/channels.md
---

# Web messaging UI

## Surfaces

| Surface | Route / tab | Data |
|---------|-------------|------|
| Profile inbox | `/@viewer/messages` (Posts submenu, after Threads) | Viewer DM + group channels |
| Object activity | `/object/:id/reviews/activity` (Reviews → Activity) | Single object channel (plain only) |

Legacy `/object/:id/messages` and `/object/:id/reviews/messages` resolve to Activity.

Other users' profiles hide the Messages tab. Direct URL to another user's messages redirects to the viewer's inbox.

## Layout

Profile inbox uses three columns on desktop: channel list (left rail), chat (center), About (right rail). Object **Activity** is a feed column under Reviews (no chat card frame).

| Shell | Class / variant | Notes |
|-------|-----------------|-------|
| Center chat | `MESSAGING_CENTER_VIEWPORT_SHELL_CLASS` | Profile inbox only |
| Left list + right About | `MessagingViewportShell` `variant="sideRail"` | Profile inbox |
| Object activity | Plain `FeedColumn` section | Top `ObjectActivityComposeBar`; `ObjectActivityFeedList` + bottom infinite scroll |

Left rail: **Messages** header, scrollable channel list, **New message** as a full-width accent footer button. Right About rail: centered **About** heading and avatar; members scroll; **Leave group** pinned to the column footer.

Internal scroll lives in list/message/members panels; column shells use `overflow-hidden` flex columns so footers align across all three columns.

Outgoing message bubbles use `bg-accent-soft` + `text-fg` (see [theme.md](./theme.md)).

## API mapping

| UI action | query-api |
|-----------|-----------|
| Channel list | `GET /query/v1/channels` + `X-Viewer` |
| Channel detail | `GET /query/v1/channels/{id}` |
| Message history | `POST /query/v1/channels/{id}/messages` |
| Mark read | `POST /query/v1/channels/{id}/read` |
| Object channel | `GET /query/v1/objects/{object_id}/channel` |
| Object messages | `POST /query/v1/objects/{object_id}/channel/messages` |

## Send flow

Client builds `message_create` via `@opden-data-layer/hive-broadcast` (`buildOslMessageCreateOp`), broadcasts with wallet, awaits trx confirmation, revalidates cache tags.

- Existing channel (plain): `{ channel_id, body }`
- New DM (plain): `{ peer, body }`
- Encrypted: `{ channel_id, encrypted_body, encryption: { v: 1, mode, to } }` — no `body`

## Compose bar (plain + encrypted)

Two icon buttons in `MessagingComposeBar`:

| Button | Action |
|--------|--------|
| Arrow | Plain send — `PlainSendDisclaimerModal` until user dismisses |
| Lock | `EncryptedSendModal` — pick recipient, encrypt (Keychain memo or ephemeral fallback), send |

Recipient selection: DM = peer; group = member dropdown. **Object activity has no encryption UI** (plain `message_create` only; indexer rejects encrypted object messages).

Decrypt in `MessagingMessageList` (profile inbox only): click encrypted bubble → Keychain `requestVerifyKey`; ephemeral outgoing bubbles are not clickable.

## API mapping (encryption)

| UI need | query-api |
|---------|-----------|
| Recipient memo public key | `GET /query/v1/users/{account}/memo-public-key` (BFF: `/api/users/{name}/memo-public-key`) |

## Group chat (profile New message)

| Selection | Action |
|-----------|--------|
| 1 user | Navigate `?peer=`; first message uses DM bootstrap (`message_create` with `peer`) |
| 2+ users | Broadcast `channel_create { kind: "group", channel_id, title?, members[] }` (viewer excluded from `members`; creator added on-chain), then navigate `?channel=`; first message is a separate `message_create` |

Optional group title is shown when two or more users are selected. `channel_id` is client-chosen (`grp-{uuid}`).

## Object channel bootstrap

Object **Activity** always renders compose + feed, even when query-api has no channel yet. Messages are fetched even without a native channel (mention cross-posts). Object channels do **not** show a member roster. **Encryption is not supported** on object channels (UI plain-only; indexer warn-skips encrypted `message_create`).

**Mention cross-post:** when Activity body links other objects (`/object/{id}` from Insert Object or pasted paths), chain-indexer stores `linked_object_ids` on the single source row. Other objects' Activity feeds include that message; foreign rows show a **From {name}** link to `/object/{id}/reviews/activity`. Reply/edit/delete on foreign rows use the message's `channel_id` (source channel); new compose still targets the page object channel.

After send, the web client invalidates Activity cache tags for `/object/` slugs in the markdown body (not only the page object).

**Original publish date:** Activity compose (+) menu includes **Date** (object Activity only — not inbox DMs; disabled while replying/editing). User picks date+time via air-datepicker; a chip shows the selection until send or clear. Optional `original_created_at_unix` is included on `message_create`. Feed bubbles show “Originally {datetime}” when stamped; otherwise time-only from `created_at_unix`. Activity **sort order** and **day grouping** use `COALESCE(original_created_at_unix, created_at_unix)` (local calendar day chips). Unstamped replies sort by publication time. Reply quotes to image-only parents show a left thumbnail instead of raw `![](url)` markdown.

**Near-duplicate imports:** query-api returns canonical rows only (`duplicate_count` on each item). When `duplicate_count > 1`, Activity bubbles show “Also imported {count} times” (`count = duplicate_count - 1`). No client-side collapsing.

Per [channels.md](../../../spec/osl/channels.md), object channels require explicit `channel_create` before `message_create`. The UI uses deterministic `buildObjectChannelId(objectId)` → `obj-ch-{objectId}` for the pending channel.

| State | First send |
|-------|------------|
| No channel in DB | Single Hive trx: `channel_create { kind: "object", channel_id, object_id, title? }` + `message_create { channel_id, body }` |
| Channel exists | `message_create` only |

## Unread (v1)

Server-side `channel_members.last_read_at_unix`. List shows `unread_count`; All/Unread tabs filter client-side. Opening a channel calls mark-read with latest message timestamp.

## Group leave

About panel (profile right rail) shows **Leave** when `leave_policy.can_leave`.

| Action | OSL |
|--------|-----|
| Leave group | `channel_leave { channel_id, successor_admin?, delete_my_messages? }` |

- Sole admin with 2+ members must pick `successor_admin` in modal.
- Last member dissolve removes channel from lists.
- Optional checkbox deletes leaver's messages (bulk on indexer).

Post-leave: redirect to `/@viewer/messages`, revalidate messaging caches, optimistic list remove.

## Group edit (admin)

About panel shows **Edit** when `viewer_role === 'admin'` on group channels.

| Action | OSL |
|--------|-----|
| Rename / photo | `channel_update { channel_id, title?, image: { cid }? }` |

Photo upload uses IPFS pipeline (`IpfsImageDropZone` + `useIpfsImageUpload`). `resolveChannelImageUrl` resolves `{ cid }` via ipfs-gateway content base.

**Add members** (Edit modal, separate from Save): multi-select user search with preflight via `validate-members`; broadcasts one Hive trx with N `channel_member_add` ops. Max **100** members per group. Muted / governance-muted users blocked in UI and on indexer.

New group create (`New message`, 2+ users): preflight via `validate-invitees` before `channel_create`.

## Message actions (edit, delete, reply, copy)

Shared `MessageRow` in inbox and object Activity.

| Action | Who | On-chain | Notes |
|--------|-----|----------|-------|
| **Edit** | Author, plaintext only | `message_update { channel_id, message_id, body }` | Compose bar enters edit mode; send label **Save** |
| **Delete** | Author only | `message_delete { channel_id, message_id }` | Confirm modal before broadcast |
| **Reply** | Any viewer on plaintext messages | `message_create` with `reply_to` + optional `quote_json` | Compose strip shows parent author |
| **Copy** | Any viewer on plaintext messages | — | Clipboard = on-chain `body` (not decrypted cache) |

**Encrypted messages (own):** delete only — no edit, copy, or reply (even after in-UI decrypt). **Others' encrypted:** no actions.

**UI:** Desktop — hover shows reply (left) and `…` menu (right). Mobile — long-press opens bottom sheet.

Action visibility uses on-chain `body` / encryption fields, not decrypted UI cache.

## Out of scope (v1)

- WebSocket / live updates
- Attachments, emoji
- Pinned messages (empty About section)
- Global nav unread badge
- HiveSigner / HiveAuth decrypt
- Multi-recipient encrypted messages
