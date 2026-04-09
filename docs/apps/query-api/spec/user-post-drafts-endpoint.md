# User post drafts (authenticated)

**Back:** [query-api README](../README.md)

Editor drafts stored in PostgreSQL table `user_post_drafts` (see [schema.sql](../../../spec/data-model/schema.sql)). Payload fields align with the legacy Mongo `UserDraftSchema` plus **`beneficiaries`** (JSON, same role as `posts.beneficiaries`).

## Authentication and authorization

All routes require **`Authorization: Bearer <access_token>`** where the token is an **access** JWT from **auth-api** (`typ: access`, subject `sub` = Hive account name). **query-api** must use the **same `JWT_SECRET`** as auth-api.

Path segment **`author`** must match the token subject (comparison is **trim + case-insensitive**). If the token is valid but `author` ≠ `sub`, the API returns **403 Forbidden**.

## HTTP

Base path: **`/query/v1/users/:author/drafts`** (global prefix `query`, URI version `v1`).

| Method | Query | Description |
|--------|--------|-------------|
| `GET` | _(none)_ | Paginated **list** of drafts for `author` (newest `lastUpdated` first). |
| `GET` | `draftId` **xor** `permlink` | **Single** draft. |
| `POST` | — | **Create** draft; server sets `draftId` (UUID). |
| `PATCH` / `PUT` | `draftId` **xor** `permlink` | **Update** draft after resolve (see below). |
| `DELETE` | `draftId` **xor** `permlink` | **Delete** draft after resolve. **204** No Content on success. |
| `POST` | path **`/drafts/bulk-delete`** | **Bulk delete** by `draftIds` (see below). **200** with `{ deleted: number }`. |

For **GET list**, do not send `draftId` or `permlink`. **`limit`** and **`cursor`** are only valid for list requests (not with `draftId`/`permlink`).

## List: `GET` without identifiers

| Query | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | integer 1–50 | `20` | Page size. |
| `cursor` | string | — | Opaque cursor from the previous response (base64url JSON: `lastUpdated`, `draftId`). |

## Single draft: resolve `draftId` or `permlink`

- **`draftId`:** Load row by `(author, draft_id)`. Missing row → **404**.
- **`permlink`:**  
  1. If a draft exists for `(author, permlink)`, return it.  
  2. Else load **`posts`** for `(author, permlink)`. If found, **insert** a new draft (copy from post, new `draftId`, `lastUpdated` = now) and return it.  
  3. If no post → **404**.

## Request bodies

### `POST` create

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Optional; default `""`. |
| `body` | string | Optional; default `""`. |
| `jsonMetadata` | JSON | Optional; stored as JSONB; default `{}`. |
| `parentAuthor` | string | Optional; default `""`. |
| `parentPermlink` | string | Optional; default `""`. |
| `permlink` | string \| null | Optional; at most one draft per `(author, permlink)` when set. |
| `beneficiaries` | JSON | Optional; default `[]`. |

### `PATCH` / `PUT` update

All fields optional; only sent fields are updated. `lastUpdated` is always set server-side to the current time.

### `POST` bulk delete (`/drafts/bulk-delete`)

| Field | Type | Description |
|-------|------|-------------|
| `draftIds` | string[] (UUID) | 1–50 ids; deletes rows for `(author, draft_id)` in this set. Ids that do not exist are ignored. |

Response: `{ "deleted": number }` — count of rows actually removed (may be less than `draftIds.length`).

## Response shapes

### `UserPostDraftView` (single draft / create / update)

| Field | Type |
|-------|------|
| `draftId` | string |
| `author` | string |
| `title` | string |
| `body` | string |
| `jsonMetadata` | JSON |
| `parentAuthor` | string |
| `parentPermlink` | string |
| `permlink` | string \| null |
| `beneficiaries` | JSON |
| `lastUpdated` | number (Unix **milliseconds**) |

### List: `UserPostDraftListResponse`

| Field | Type |
|-------|------|
| `items` | `UserPostDraftView[]` |
| `cursor` | string \| null |
| `hasMore` | boolean |

## Implementation notes

- Code: `apps/query-api/src/domain/drafts/`, `apps/query-api/src/controllers/user-post-drafts.controller.ts`, guards under `apps/query-api/src/auth/`.
