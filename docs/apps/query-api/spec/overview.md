---
id: docs-apps-query-api-spec-overview
title: query-api
description: Read-path HTTP API for objects, feeds, search, and governance-masked projections.
type: overview
status: active
scope: query-api
tags: [query-api, overview]
updated_at: 2026-06-10
related:
  - docs/README.md
  - docs/spec/objects-domain.md
  - docs/spec/governance-resolution.md
  - docs/apps/chain-indexer/spec/overview.md
---

# query-api

Read-path API — governance masking, object resolution (via shared domain libraries).

**Back:** [Documentation index](../../../README.md) · **Related:** [Objects domain](../../../spec/objects-domain.md), [Governance resolution](../../../spec/governance-resolution.md), [chain-indexer](../../chain-indexer/spec/overview.md) (write path)

## Purpose

The **query-api** application is the **read path**: it serves HTTP endpoints that assemble **ResolvedView** payloads with tenant- and request-scoped governance masks applied. It does **not** ingest blockchain data; neutral state comes from **chain-indexer** (see [architecture overview](../../../architecture/overview.md)).

## Feature specs

| Feature | Description |
|---------|-------------|
| [User profile endpoint](users-profile-endpoint.md) | `GET /query/v1/users/:name/profile` |
| [User notification settings](user-notification-settings.md) | `GET /query/v1/users/:name/notification-settings` |
| [User account sidebar](users-account-sidebar.md) | `GET /query/v1/users/:name/account-sidebar` |
| [User social lists](user-social-lists.md) | `GET .../:name/followers`, `/following`, `/following-objects` |
| [OSL messaging](osl-messaging.md) | Channels, object activity, `POST .../:name/following-objects/messages` |
| [User account authority lists](user-account-auths-endpoint.md) | `GET .../:name/authority-grantors`, `/authority-grantees` |
| [Shop categories](categories.md) | `GET /query/v1/users/:name/categories` |
| [Category objects feed](category-objects.md) | `GET /query/v1/categories/objects` |
| [Shop / recipe object feeds](shop-feed-endpoints.md) | `GET .../shop-objects`, `GET .../shop-sections`, `GET .../shop/filters` |
| [User favorites](users-favorites-endpoint.md) | `GET .../favorites/types`, `GET .../favorites`, `POST .../favorites/map` |
| [User expertise](user-expertise.md) | `GET .../expertise/counters`, `GET .../expertise/objects` |
| [Object experts](object-experts.md) | `GET .../objects/:id/experts` |
| [User blog feed endpoint](user-blog-feed-endpoint.md) | `POST /query/v1/users/:name/blog` |
| [User threads feed endpoint](user-threads-feed-endpoint.md) | `POST /query/v1/users/:name/threads` |
| [User comments feed endpoint](user-comments-feed-endpoint.md) | `POST /query/v1/users/:name/comments` (Hive) |
| [User mentions feed endpoint](user-mentions-feed-endpoint.md) | `POST /query/v1/users/:name/mentions` (`post_mentions`) |
| [User activity endpoint](user-activity-endpoint.md) | `POST /query/v1/users/:name/activity` (Hive `get_account_history`) |
| [User WAIV wallet](user-waiv-wallet-endpoint.md) | `GET /query/v1/users/:name/wallet/waiv`, `POST .../wallet/waiv/history`, `GET .../wallet/engine/:symbol/delegations` |
| [User ENGINE wallet](user-engine-wallet-endpoint.md) | `GET /query/v1/users/:name/wallet/engine`, `POST .../wallet/engine/history` |
| [User ENGINE swap / deposit / withdraw](user-engine-swap-endpoints.md) | `GET .../engine/swap/list`, `POST .../engine/swap/quote`, `GET .../engine/deposit/list`, `GET .../engine/deposit/address`, `GET .../engine/withdraw/list`, `POST .../engine/withdraw/quote` |
| [User HIVE wallet](user-hive-wallet-endpoint.md) | `GET .../wallet/hive`, `GET .../wallet/hive/delegations`, `GET .../wallet/hive/rc-delegations` |
| [User HIVE Changelly withdraw](user-hive-changelly-withdraw.md) | `GET .../wallet/hive/withdraw/range`, `POST .../withdraw/estimate`, `POST .../withdraw/create` |
| [Hive advanced report](user-hive-advanced-report-endpoint.md) | `POST /query/v1/wallet/hive/advanced-report`, `POST .../exemptions` |
| [WAIV advanced report](user-waiv-advanced-report-endpoint.md) | `POST /query/v1/wallet/waiv/advanced-report` |
| [WAIV generated report](user-waiv-generated-report-endpoint.md) | `POST/GET /query/v1/wallet/waiv/generated-reports`, rows, stop |
| [Single post endpoint](single-post-endpoint.md) | `GET /query/v1/posts/:author/:permlink` |
| [Home feed](home-feed.md) | `POST /query/v1/posts/feed` |
| [Post discussion endpoint](post-discussion-endpoint.md) | `GET /query/v1/posts/:author/:permlink/discussion` |
| [Post voters endpoint](post-voters-endpoint.md) | `GET /query/v1/posts/:author/:permlink/voters` |
| [Post reward](post-reward.md) | `reward` + `waivRewardEligible` on post payloads |
| [User post drafts](user-post-drafts-endpoint.md) | Draft CRUD (Bearer JWT, same `JWT_SECRET` as auth-api) |
| [Search](search.md) | `GET /query/v1/search`, `GET /query/v1/search/counts` |
| [Objects resolve](objects-resolve.md) | `POST /query/v1/objects/resolve` (`aggregateRating` semantics) |
| [Objects resolve-nested](objects-resolve-nested.md) | `POST /query/v1/objects/resolve-nested` (optional `update_types`) |
| [Object avatar fallback](object-avatar-fallback.md) | `fields.image` from parent when child has no `image` |
| [Object ref lists](object-ref-list-endpoints.md) | `GET .../related`, `/similar`, `/add-on` |
| [Object field references](object-field-references.md) | `GET .../field-references`, `/field-references/:type` |
| [Object update by id](object-update-by-id-endpoint.md) | `GET .../objects/:id/updates/:updateId` |
| [Update voters](update-voters-endpoint.md) | `GET .../objects/:id/updates/:updateId/voters` |
| [Object variant options](object-options.md) | `GET .../options` — aggregated Color/Size selectors |
| [Object Related album](object-related-album.md) | `GET .../gallery/related/preview`, `GET .../gallery/related` |
| [Object posts feed](object-posts-feed.md) | `POST /query/v1/objects/:id/posts` (Reviews tab) |
| [Object threads feed](object-threads-feed.md) | `POST /query/v1/objects/:id/threads` (Reviews > Threads) |
| [Object SEO](object-seo.md) | SEO fields on resolved objects |
| [MCP agent mirror](mcp.md) | `POST /query/mcp` — live data tools for agents |
| [OBL reads](obl.md) | Offer search, mutual ledger, balance, USD→WAIV conversion, offer drafts |

## Verification

| Command | Purpose |
|---------|---------|
| `pnpm nx serve query-api` | Dev server |
| `pnpm nx build query-api` | Production build |
| `pnpm nx test query-api` | Unit tests |

**Related code:** [`apps/query-api/`](../../../../apps/query-api/).
