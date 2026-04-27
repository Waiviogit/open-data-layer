# query-api

Read-path API — governance masking, object resolution (via shared domain libraries).

## Links

| Doc | Description |
|-----|-------------|
| [Getting started](../../getting-started.md) | Local setup |
| [Specification index](../../spec/README.md) | Governance, vote semantics |
| [Objects domain](../../spec/objects-domain.md) | ResolvedView assembly |
| [Governance resolution](../../spec/governance-resolution.md) | Masks and snapshots |
| [User profile endpoint](spec/users-profile-endpoint.md) | `GET /query/v1/users/:name/profile` |
| [User blog feed endpoint](spec/user-blog-feed-endpoint.md) | `POST /query/v1/users/:name/blog` |
| [User threads feed endpoint](spec/user-threads-feed-endpoint.md) | `POST /query/v1/users/:name/threads` |
| [Single post endpoint](spec/single-post-endpoint.md) | `GET /query/v1/posts/:author/:permlink` |
| [User post drafts](spec/user-post-drafts-endpoint.md) | `GET|POST|PATCH|PUT|DELETE /query/v1/users/:author/drafts` (Bearer JWT, same `JWT_SECRET` as auth-api) |

## App code

`apps/query-api/`
