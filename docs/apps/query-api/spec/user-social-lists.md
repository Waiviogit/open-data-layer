# User social lists (`followers`, `following`, `following-objects`, object followers, object authority)

Read endpoints on `accounts_current`, `user_subscriptions`, `user_object_follows`, and `object_authority`.

## Routes

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/query/v1/users/{name}/followers` | Accounts that follow `{name}`, joined to `accounts_current`. |
| `GET` | `/query/v1/users/{name}/following` | Accounts `{name}` follows, joined to `accounts_current`. |
| `GET` | `/query/v1/users/{name}/following-objects` | Objects `{name}` follows; returns `ProjectedObject` JSON (`name`, `image`, `weight`). |
| `GET` | `/query/v1/objects/{objectId}/followers` | Hive accounts following `{objectId}` (`user_object_follows` joined to `accounts_current`). Same list shape as user followers. |
| `GET` | `/query/v1/objects/{objectId}/authority` | Accounts with `administrative` or `ownership` on `{objectId}` (`object_authority` joined to `accounts_current`). Query `authority_type`; same list shape as followers. |

Optional header: **`X-Viewer`** — when set, each account row includes **`isCurrentFollowing`** (whether the viewer has a `user_subscriptions` edge to that account).

Locale: **`Accept-Language`** / **`X-Locale`** resolve object fields for `following-objects` (same as other object reads).

## Query parameters

Followers / following / **object followers**:

- `sort` — `rank` \| `followers` \| `a-z` \| `recency` (default `recency`)
- `skip`, `limit` — pagination (`limit` max 50, default 20; **`limit=0` is valid** for `total` / tab counts without fetching rows)

**Object authority** (`GET .../objects/{objectId}/authority`):

- `authority_type` — `administrative` \| `ownership` (required)
- `sort`, `skip`, `limit` — same as followers / following

For **object** `.../followers`, **`recency`** orders by `user_object_follows.created_at` (not `user_subscriptions`).

For **object** `.../authority`, **`recency`** orders by `object_authority.created_at`.

Following-objects:

- `sort` — `weight` \| `recency` (default `weight`)
- `skip`, `limit` — same constraints

Sort semantics:

| Value | Ordering |
| ----- | -------- |
| `rank` | `wobjects_weight` DESC |
| `followers` | `users_following_count` DESC |
| `a-z` | `name` ASC |
| `recency` | `user_subscriptions.created_at` DESC (users) / `user_object_follows.created_at` DESC (object followers) / `object_authority.created_at` DESC (object authority) |
| `weight` (objects) | `objects_core.weight` DESC |
| `recency` (objects) | `user_object_follows.created_at` DESC |

Response envelope:

```json
{ "items": [...], "total": 466, "hasMore": true }
```

## DDL

`user_subscriptions.created_at`, `user_object_follows.created_at`, and `object_authority.created_at` are used for **`recency`** sorts. Migrations: `00009_subscription_follow_timestamps`, `00012_object_authority_created_at`; see [`docs/spec/data-model/users.md`](../../../spec/data-model/users.md).

## OpenAPI

Registered in [`apps/query-api/src/openapi/users-social.openapi.ts`](../../../../apps/query-api/src/openapi/users-social.openapi.ts); object routes (`/followers`, `/authority`) in [`apps/query-api/src/openapi/objects.openapi.ts`](../../../../apps/query-api/src/openapi/objects.openapi.ts) (`generate-openapi` import).
