---
id: docs-apps-query-api-spec-user-account-auths-endpoint
title: User Hive account authority lists
description: Reverse lookup for Hive account_auths — who delegated owner/active/posting authority to a user.
type: spec
status: active
scope: query-api
tags: [query-api, hive, authority]
updated_at: 2026-09-09
related:
  - docs/apps/query-api/spec/overview.md
  - docs/apps/chain-indexer/spec/account-authority-grants.md
  - docs/spec/hive-account-authority.md
---

# User Hive account authority lists

Reverse index for Hive `account_auths` edges stored in `user_account_auths`. Replaces the broken `condenser_api.get_account_references` RPC.

**Direct edges only.** Each row is one `(grantor, authority_type, grantee)` tuple from chain state. Nested authorization (e.g. `A → B → C` where C can sign as A) is evaluated by Hive at sign time but **not** expanded here — `get_user_authority_grantors(C)` returns B, not A. See [hive-account-authority.md](../../../spec/hive-account-authority.md).

## Routes

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/query/v1/users/{name}/authority-grantors` | Accounts that delegated `owner`, `active`, or `posting` authority **to** `{name}`. |
| `GET` | `/query/v1/users/{name}/authority-grantees` | Accounts that received authority **from** `{name}`. |

Public read — no JWT. Profile fields (`avatarUrl`, `wobjectsWeight`, `usersFollowingCount`) are joined from `accounts_current`.

## Query parameters

Both routes share:

| Param | Type | Default | Notes |
| ----- | ---- | ------- | ----- |
| `type` | `owner` \| `active` \| `posting` | (all) | Optional filter |
| `sort` | `rank` \| `followers` \| `a-z` \| `recency` | `a-z` | Same semantics as followers list; `recency` = `updated_at_block` DESC |
| `skip` | int ≥ 0 | `0` | Pagination offset |
| `limit` | int 0–100 | `20` | Page size |

Default sort: account name ASC, then authority type ASC.

## Response

Grantors example:

```json
{
  "items": [
    {
      "grantor": "flowmaster",
      "authorityType": "posting",
      "avatarUrl": null,
      "wobjectsWeight": 12.5,
      "usersFollowingCount": 42
    }
  ],
  "total": 1,
  "hasMore": false
}
```

Grantees use `{ "grantee", "authorityType", ...profile fields }` items with the same pagination envelope.

## Errors

- `404` when `{name}` is not in `accounts_current`.
- `400` on invalid query (e.g. unknown `type`, `limit` > 100).

## MCP

- `get_user_authority_grantors`
- `get_user_authority_grantees`

## Indexer

Live updates: [account-authority-grants](../../chain-indexer/spec/account-authority-grants.md).

Backfill: `pnpm backfill:user-account-auths`.
