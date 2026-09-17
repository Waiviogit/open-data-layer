---
id: docs-spec-data-model-messages
title: Messaging tables
description: OSL channels and messages DDL sketch.
type: spec
status: active
scope: platform
tags: [data-model, messaging]
related:
  - docs/spec/osl/channels.md
---

# Messaging data model

Migration: `00052_osl_channels_messages.ts`, encryption columns: `00055_osl_messages_encryption.ts`

Tables: `channels`, `channel_members`, `channel_aliases`, `messages`, `message_tombstones`, `message_context_exclusions`.

## `messages` encryption columns (v1)

| Column | Plain | Encrypted |
|--------|-------|-----------|
| `body` | plaintext | `NULL` |
| `encrypted_body` | `NULL` | `#…` ciphertext |
| `encryption_mode` | `NULL` | `memo` \| `ephemeral` |
| `encrypted_to` | `NULL` | recipient account |
| `encryption_v` | `NULL` | `1` |
| `encryption_meta` | `NULL` | `NULL` (multi-recipient v2) |

CHECK constraints:

- At least one of `body`, `overflow_ref`, `encrypted_body`
- `body` XOR `encrypted_body`
- Encryption metadata all-null or all-set

Partial index: `idx_messages_encrypted_to` on `(encrypted_to, created_at_unix DESC)` where `encrypted_to IS NOT NULL`.

## Original publish stamp (object activity)

Migration: `00060_messages_original_created_at.ts`

| Column | Purpose |
|--------|---------|
| `original_created_at_unix` | Optional original publish time for object activity messages; used for Activity feed sort/grouping (`COALESCE(original_created_at_unix, created_at_unix)`) and “Originally {datetime}” caption; does not affect `idx_messages_channel_time` |
| `updated_at_unix` | Set by `message_update` when author edits plaintext body; `null` when never edited |

Key indexes:

- `uq_channels_direct_pair_hash` on `pair_hash` where `kind=direct`
- `uq_channels_object_kind` on `object_id` where `kind=object`
- `idx_messages_channel_time` on `(channel_id, created_at_unix DESC, event_seq DESC)`
- `idx_messages_linked_object_ids` GIN on `linked_object_ids` (migration `00061_messages_linked_object_ids.ts`)

## Linked object mentions (object channels)

Migration: `00061_messages_linked_object_ids.ts`

| Column | Purpose |
|--------|---------|
| `linked_object_ids` | `TEXT[] NOT NULL DEFAULT '{}'` — object ids mentioned in plaintext `body` via `/object/{id}` or `#objectId`, filtered to `objects_core`, excluding the channel's native `object_id`, capped at 20 |

Index-time only — **not** broadcast on chain. DM/group channels always store `{}` even if the body contains object links.

Messages are **not** stored in `object_updates`.

## Activity dedup (object channels)

Migration: `00064_messages_activity_dedup.ts`

| Column | Purpose |
|--------|---------|
| `source_platform` / `source_id` | Origin platform identity; both null or both set |
| `text_simhash` | `BIGINT` SimHash of original caption (agent-supplied) |
| `image_phashes` | `BIGINT[]` pHashes of original images |
| `fingerprint_v` | Algorithm version; rows of different versions are never compared |
| `dup_group_id` | Cluster root `message_id`; equals `message_id` on canonical rows |

Indexes:

- `uq_messages_source` unique on `(channel_id, source_platform, source_id)` where platform set
- `idx_messages_dedup_window` on `(channel_id, COALESCE(original_created_at_unix, created_at_unix) DESC)` where `fingerprint_v IS NOT NULL`
- `idx_messages_dup_group` on `(dup_group_id)`

Deleting a cluster root promotes the earliest remaining member to root and repoints members in the same transaction.
