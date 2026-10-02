---
id: docs-apps-query-api-spec-objects-resolve
title: Objects resolve
description: "When the `aggregateRating` update type is included in the resolve request, `fields.aggregateRating` is **always an array** (possibly empty) of aspect rows:"
type: spec
status: active
scope: query-api
tags: [query-api, objects-resolve]
updated_at: 2026-06-10
related:
  - docs/apps/query-api/spec/overview.md
  - docs/spec/objects-domain.md
  - docs/spec/governance-resolution.md
  - docs/README.md
---

# Objects resolve (`POST /query/v1/objects/resolve`)

## Governance object fields

When resolving a `governance` object, governance update types are projected into `fields`:

| `update_type` | Projected shape |
|---------------|-----------------|
| `admins`, `trusted`, `moderators`, `authorities`, `authors`, `whitelist`, `restricted`, `banned` | `string[]` — Hive account names from VALID rows |
| `objectControl` | `string \| null` — e.g. `"full"` |
| `inheritsFrom` | `object[]` — `{ object_id, scope }` per VALID row |
| `validityCutoff` | `object[]` — `{ account, timestamp }` per VALID row |

These are **this object's own VALID updates**, not the merged governance snapshot used internally for vote validity and masking. See [governance-resolution.md](../../../spec/governance-resolution.md).

## `fields.aggregateRating`

When the `aggregateRating` update type is included in the resolve request, `fields.aggregateRating` is **always an array** (possibly empty) of aspect rows:

| Field | Meaning |
|-------|---------|
| `dimension` | Label for the aspect (from the update’s `value_text`). |
| `averageRating` | Mean rank score for that aspect’s `update_id`, **0–10000** scale, or **`null`** when unknown. |
| `userRating` | Same scale for the viewing account’s vote when the `X-Viewer` header names a Hive account and a matching `rank_votes` row exists; otherwise **`null`**. When multiple rows exist per aspect, the row with the greatest `event_seq` wins. |
| `totalVoters` | `COUNT(*)` of `rank_votes` rows for that aspect’s `update_id` in the batch scope. |

This shape is a **breaking change** for clients that expected the previous object with `dimensions` and a top-level `averageRating`.

See also: OpenAPI path description in `apps/query-api/src/openapi/objects.openapi.ts`.
