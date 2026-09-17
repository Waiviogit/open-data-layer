---
id: docs-apps-query-api-spec-osl-messaging
title: OSL messaging API
description: Channels list, message history, object channel feeds.
type: spec
status: active
scope: query-api
tags: [query-api, messaging]
---

# OSL messaging API (v1)

## Endpoints

| Method | Path | Notes |
|--------|------|-------|
| POST | `/query/v1/channels/{id}/read` | Body `{ last_read_at_unix }`; member-only; monotonic update |
| GET | `/query/v1/channels` | Requires `X-Viewer`; items include `unread_count`, `image`, `last_message_preview`, `last_message_encrypted` |
| GET | `/query/v1/channels/{id}` | Member required (except object `public_read` via object route) |
| GET | `/query/v1/channels/by-alias/{alias}` | Resolve `dm:` / `obj:` aliases |
| POST | `/query/v1/channels/{id}/messages` | Keyset cursor `(created_at_unix, event_seq)` |
| GET | `/query/v1/objects/{object_id}/channel` | Default object channel meta |
| POST | `/query/v1/objects/{object_id}/channel/messages` | Public read; native channel **optional**; unions native + mention rows; governance + viewer mute filters; keyset cursor `(COALESCE(original_created_at_unix, created_at_unix), event_seq)`; optional `include_duplicates` (default false — canonical rows only) |
| POST | `/query/v1/objects/{object_id}/channel/messages/dedup-check` | Preflight duplicate check before broadcasting archival imports; echoes fingerprint |
| GET | `/query/v1/users/{account}/memo-public-key` | Public memo key for encryption; 404 if account missing |

## Message DTO encryption fields

`MessageDto` includes:

| Field | Description |
|-------|-------------|
| `encrypted_body` | Ciphertext or `null` for plaintext |
| `encryption` | `{ v, mode, to }` or `null` |
| `updated_at_unix` | Unix seconds when author last edited plaintext body, or `null` |
| `source_object` | `{ object_id, name }` when the message appears on an object Activity feed via `linked_object_ids` (mention cross-post); `null` on native-channel rows |
| `source` | `{ platform, id }` from on-chain import metadata, or `null` |
| `duplicate_of` | Cluster root `message_id` when this row is a near-duplicate member; `null` on canonical rows |
| `duplicate_count` | Number of rows sharing the cluster root (including the canonical row) |

Server **never** decrypts. Channel list preview: encrypted last message → `last_message_preview: null`, `last_message_encrypted: true` (ciphertext never in preview).

## DM projection

- `display_title` = peer account for viewer
- `list_title` = sorted members joined with ` & `

## Object channel feed

Object must exist in `objects_core`. Returns messages where `channels.kind = 'object'` and (`channels.object_id = :object_id` OR `:object_id = ANY(messages.linked_object_ids)`). Native channel row is **not** required — objects with only mention cross-posts still get a feed.

Excludes authors in governance `muted` and (when `X-Viewer` set) viewer `user_account_mutes`.

Mention-only rows include `source_object: { object_id, name }` (source = native channel object; name from object channel `title`).

Object activity message history is ordered by `COALESCE(original_created_at_unix, created_at_unix) DESC, event_seq DESC`. The keyset cursor field `createdAtUnix` carries that sort unix (coerced with `Number(...)` before encode). DM/group channel history still uses chain `created_at_unix`.

## Channel detail extensions

`GET /query/v1/channels/{id}` includes:

| Field | Description |
|-------|-------------|
| `members[]` | `{ account, role: "admin" \| "member" }`. For `kind=object` always `[]` (no membership roster). |
| `viewer_role` | Viewer's role or `null` |
| `leave_policy` | `{ can_leave, requires_successor, eligible_successors[] }` |

Dissolved channels (`dissolved_at_unix` set) return 404 and are excluded from `GET /query/v1/channels`.

`leave_policy.requires_successor` is `true` when the viewer is the sole admin among 2+ members.

## Validate members (preflight)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/query/v1/channels/{id}/validate-members` | Group admin + `X-Viewer`; body `{ accounts[] }` |
| POST | `/query/v1/channels/validate-invitees` | New group create; body `{ accounts[] }` |

Response: `{ results: [{ account, addable, reason? }] }` where `reason` is one of `muted_by_viewer`, `muted_viewer`, `governance_muted`, `already_member`, `group_full`.

Max group size: **100** members (including creator).

## Activity dedup preflight

`POST /query/v1/objects/{object_id}/channel/messages/dedup-check`

Body (at least one of `source`, `original_text`, `text_simhash`, `image_phashes`):

```json
{
  "source": { "platform": "instagram", "id": "ABC123" },
  "original_text": "ORIGINAL caption before rewriting",
  "original_created_at_unix": 1700000000
}
```

Response:

```json
{
  "duplicate": false,
  "reason": null,
  "match": null,
  "fingerprint": { "v": 1, "text_simhash": "…", "normalized_length": 120 },
  "candidates_scanned": 3
}
```

- `404` — unknown object
- `duplicate: false` — not a duplicate (distinct from transport errors)
- `fingerprint` echo — use the same `text_simhash` + `fp_v` when broadcasting

MCP: `check_object_activity_duplicate`. Algorithm: [activity-fingerprint.md](../../../spec/osl/activity-fingerprint.md).
