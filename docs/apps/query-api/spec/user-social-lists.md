# User social lists (`followers`, `following`, `following-objects`)

Read endpoints on `accounts_current`, `user_subscriptions`, and `user_object_follows`.

## Routes

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/query/v1/users/{name}/followers` | Accounts that follow `{name}`, joined to `accounts_current`. |
| `GET` | `/query/v1/users/{name}/following` | Accounts `{name}` follows, joined to `accounts_current`. |
| `GET` | `/query/v1/users/{name}/following-objects` | Objects `{name}` follows; returns `ProjectedObject` JSON (`name`, `image`, `weight`). |

Optional header: **`X-Viewer`** — when set, each account row includes **`isCurrentFollowing`** (whether the viewer has a `user_subscriptions` edge to that account).

Locale: **`Accept-Language`** / **`X-Locale`** resolve object fields for `following-objects` (same as other object reads).

## Query parameters

Followers / following:

- `sort` — `rank` \| `followers` \| `a-z` \| `recency` (default `recency`)
- `skip`, `limit` — pagination (`limit` max 50, default 20; **`limit=0` is valid** for `total` / tab counts without fetching rows)

Following-objects:

- `sort` — `weight` \| `recency` (default `weight`)
- `skip`, `limit` — same constraints

Sort semantics:

| Value | Ordering |
| ----- | -------- |
| `rank` | `wobjects_weight` DESC |
| `followers` | `users_following_count` DESC |
| `a-z` | `name` ASC |
| `recency` | `user_subscriptions.created_at` DESC |
| `weight` (objects) | `objects_core.weight` DESC |
| `recency` (objects) | `user_object_follows.created_at` DESC |

Response envelope:

```json
{ "items": [...], "total": 466, "hasMore": true }
```

## DDL

`user_subscriptions.created_at` and `user_object_follows.created_at` are required for **`recency`** sorts. Migration: `00009_subscription_follow_timestamps`; see [`docs/spec/data-model/users.md`](../../../spec/data-model/users.md).

## OpenAPI

Registered in [`apps/query-api/src/openapi/users-social.openapi.ts`](../../../../apps/query-api/src/openapi/users-social.openapi.ts) (`generate-openapi` import).
