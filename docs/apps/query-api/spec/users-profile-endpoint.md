# User profile (read)

**Back:** [query-api README](../README.md)

## HTTP

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/query/v1/users/:name/profile` | Public profile fields for the web shell (`UserProfileView`). |

Path parameter `name` is the Hive account name (same constraints as legacy URLs: 3–32 chars, `[a-zA-Z0-9.-]`).

## Response: `UserProfileView`

JSON object:

| Field | Type | Source |
|-------|------|--------|
| `name` | string | `accounts_current.name` |
| `displayName` | string | First non-empty: `alias` (trimmed), then `posting_json_metadata.profile.name`, then `name` |
| `bio` | string | `posting_json_metadata.profile.about` or `""` |
| `avatarUrl` | string \| null | First non-empty: `profile_image`, then `posting_json_metadata.profile.profile_image` |
| `coverImageUrl` | string \| null | `posting_json_metadata.profile.cover_image` or null |
| `followerCount` | number | `accounts_current.followers_count` |
| `followingCount` | number | `accounts_current.users_following_count` |
| `postingCount` | number | `accounts_current.post_count` |
| `reputation` | number | `accounts_current.object_reputation` |

`posting_json_metadata` is stored as a JSON string on the row; the server parses it safely (invalid JSON → treated as no metadata).

## Errors

| Status | When |
|--------|------|
| `404` | No row in `accounts_current` for `name`. |

## OpenAPI

Documented in the app’s generated OpenAPI registry (`openapi/users.openapi.ts`); Swagger UI: `/query/v1/docs` on the running server.

## See also

- DB types: [`libs/core/src/db/odl/tables.ts`](../../../../libs/core/src/db/odl/tables.ts) — `AccountsCurrentTable`
