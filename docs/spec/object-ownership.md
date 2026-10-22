---
id: docs-spec-object-ownership
title: Object Ownership
description: Content moderation edge with exclusive vs supervised ownership — `object_ownership` chain action, validity rules, and query-api surfaces.
type: spec
status: active
scope: platform
tags: [platform, domain]
updated_at: 2026-08-21
related:
  - docs/spec/object-favorite.md
  - docs/spec/governance-resolution.md
---

# object_ownership

Content moderation edge with `ownership_type`: `exclusive` | `supervised`.

## Chain action

`object_ownership` — payload `{ object_id, method, ownership_type? }` (default `exclusive`). Account = posting auth.

Repeat **add** upserts `ownership_type` on PK `(object_id, account)`.

## Postgres

`object_ownership (object_id, account, ownership_type, event_seq, created_at)` — PK `(object_id, account)`.

## Validity (exclusive only)

Exclusive owners in set **E** gate updates. **E** is computed as:

```
recognizedExclusive = { exclusive holders } ∩ { governance admins ∪ governance trusted ∪ governance authorities }

if recognizedExclusive is non-empty:
  E = recognizedExclusive
else if object_control = 'full':
  E = { governance admins }
else:
  E = ∅
```

When **E** is non-empty:

- Different updates: VALID if creator ∈ E or any E member voted `for`.
- Same update: among E votes, highest `event_seq` wins (`for` → VALID, `against` → REJECTED).
- `approve_percent` and winner-mode `rank_score` use the same **E** (only E votes are 100/0 or decisive rank; other admin/trusted votes are ignored).

**Supervised** rows are stored for UI; they do **not** affect **E** in this release.

## Query API

- `GET /objects/:id/ownership?ownership_type=exclusive|supervised`
- Counts: `exclusive_count`, `supervised_count`
- Projection: `hasOwnershipAuthority`

## Migration

Legacy Mongo `authorities` body `ownership` → `object_ownership` with `ownership_type = exclusive`.

@see docs/spec/object-favorite.md
@see docs/spec/governance-resolution.md
