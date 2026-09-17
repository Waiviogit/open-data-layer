---
id: docs-apps-query-api-spec-mcp
title: query-api MCP (agent mirror)
description: Streamable HTTP MCP exposing read-only query-api endpoints as tools for agents.
type: spec
status: active
scope: query-api
tags: [query-api, mcp, agent]
updated_at: 2026-06-11
related:
  - docs/apps/query-api/spec/overview.md
  - docs/skills/query-api-mcp-routing.md
  - docs/skills/wallet-delegation-swap-for-agents.md
  - docs/skills/knowledge-api-routing.md
---

# query-api MCP (agent mirror)

Read-only **live data** MCP at `POST /query/mcp` (no URI version). Each tool delegates to the same `*Endpoint.execute()` used by HTTP controllers.

**Back:** [overview](overview.md) · **Routing skill:** [query-api-mcp-routing.md](../../skills/query-api-mcp-routing.md)

## Stack

- NestJS `McpService` — Streamable HTTP, stateless
- Tool metadata: `apps/query-api/src/mcp/mcp-tool-catalog.ts`
- Server instructions: `apps/query-api/src/mcp/mcp-instructions.ts`

## Context parameters

Replaces HTTP headers on tools that use `withMcpLocaleContext`:

| MCP arg | HTTP header |
|---------|-------------|
| `locale` (default `en-US`) | `Accept-Language` / `X-Locale` |
| `viewer` | `X-Viewer` |
| `governance_object_id` | `X-Governance-Object-Id` |

## MCP resources and prompts

| URI / name | Content |
|------------|---------|
| `odl-query://routing` | Routing skill markdown (from disk or knowledge-api fallback message) |
| `odl-query://catalog/tools` | JSON tool catalog |
| Prompt `first_visit` | Numbered onboarding steps |

Set `QUERY_API_DOCS_ROOT` to repo root in dev if `odl-query://routing` cannot read `docs/skills/query-api-mcp-routing.md` from cwd.

## Excluded

- **User post drafts** — JWT writes; not mirrored to MCP (see [user-post-drafts-endpoint.md](user-post-drafts-endpoint.md)).

## Tool inventory

| Tool | HTTP equivalent | Spec |
|------|-----------------|------|
| `search` | `GET /query/v1/search` | [search.md](search.md) |
| `search_counts` | `GET /query/v1/search/counts` | [search.md](search.md) |
| `discover_objects` | `GET /query/v1/discover/objects` | [search.md](search.md) |
| `discover_users` | `GET /query/v1/discover/users` | — |
| `discover_tag_categories` | `GET /query/v1/discover/tag-categories` | — |
| `resolve_object` | `POST /query/v1/objects/resolve` | [objects-resolve.md](objects-resolve.md) |
| `resolve_nested_objects` | `POST /query/v1/objects/resolve-nested` | [objects-resolve.md](objects-resolve.md) |
| `check_object_exists` | `GET /query/v1/objects/:id/exists` | — |
| `get_object_related` | `GET .../related` | [object-ref-list-endpoints.md](object-ref-list-endpoints.md) |
| `get_object_related_album_preview` | `GET .../gallery/related/preview` | [object-related-album.md](object-related-album.md) |
| `get_object_related_album` | `GET .../gallery/related` | [object-related-album.md](object-related-album.md) |
| `get_object_similar` | `GET .../similar` | [object-ref-list-endpoints.md](object-ref-list-endpoints.md) |
| `get_object_add_on` | `GET .../add-on` | [object-ref-list-endpoints.md](object-ref-list-endpoints.md) |
| `get_object_followers` | `GET .../followers` | [user-social-lists.md](user-social-lists.md) |
| `get_object_experts` | `GET .../experts` | [object-experts.md](object-experts.md) |
| `get_object_favorited_by` | `GET .../favorited-by` | [user-social-lists.md](user-social-lists.md) |
| `get_object_ownership` | `GET .../ownership` | [user-social-lists.md](user-social-lists.md) |
| `get_object_updates` | `GET .../updates` | — |
| `get_user_profile` | `GET .../profile` | [users-profile-endpoint.md](users-profile-endpoint.md) |
| `get_user_blog` | `POST .../blog` | [user-blog-feed-endpoint.md](user-blog-feed-endpoint.md) |
| `get_user_mentions` | `POST .../mentions` | [user-mentions-feed-endpoint.md](user-mentions-feed-endpoint.md) |
| `get_user_threads` | `POST .../threads` | [user-threads-feed-endpoint.md](user-threads-feed-endpoint.md) |
| `get_user_comments` | `POST .../comments` | [user-comments-feed-endpoint.md](user-comments-feed-endpoint.md) |
| `get_user_followers` | `GET .../followers` | [user-social-lists.md](user-social-lists.md) |
| `get_user_following` | `GET .../following` | [user-social-lists.md](user-social-lists.md) |
| `get_user_following_objects` | `GET .../following-objects` | [user-social-lists.md](user-social-lists.md) |
| `get_user_authority_grantors` | `GET .../authority-grantors` | [user-account-auths-endpoint.md](user-account-auths-endpoint.md) |
| `get_user_authority_grantees` | `GET .../authority-grantees` | [user-account-auths-endpoint.md](user-account-auths-endpoint.md) |
| `get_user_favorites_types` | `GET .../favorites/types` | [users-favorites-endpoint.md](users-favorites-endpoint.md) |
| `get_user_favorites` | `GET .../favorites` | [users-favorites-endpoint.md](users-favorites-endpoint.md) |
| `post_user_favorites_map` | `POST .../favorites/map` | [users-favorites-endpoint.md](users-favorites-endpoint.md) |
| `get_user_expertise_counters` | `GET .../expertise/counters` | [user-expertise.md](user-expertise.md) |
| `get_user_expertise_objects` | `GET .../expertise/objects` | [user-expertise.md](user-expertise.md) |
| `get_user_categories` | `GET .../categories` | [categories.md](categories.md) |
| `get_user_shop_filters` | `GET .../shop/filters` | [shop-feed-endpoints.md](shop-feed-endpoints.md) |
| `get_user_shop_objects` | `GET .../shop-objects` | [shop-feed-endpoints.md](shop-feed-endpoints.md) |
| `get_user_shop_sections` | `GET .../shop-sections` | [shop-feed-endpoints.md](shop-feed-endpoints.md) |
| `get_user_waiv_wallet` | `GET .../wallet/waiv` | [user-waiv-wallet-endpoint.md](user-waiv-wallet-endpoint.md) |
| `get_user_waiv_wallet_history` | `POST .../wallet/waiv/history` | [user-waiv-wallet-endpoint.md](user-waiv-wallet-endpoint.md) |
| `get_user_engine_wallet` | `GET .../wallet/engine` | [user-engine-wallet-endpoint.md](user-engine-wallet-endpoint.md) |
| `get_user_engine_wallet_history` | `POST .../wallet/engine/history` | [user-engine-wallet-endpoint.md](user-engine-wallet-endpoint.md) |
| `get_user_engine_swap_list` | `GET .../wallet/engine/swap/list` | [user-engine-swap-endpoints.md](user-engine-swap-endpoints.md) |
| `post_user_engine_swap_quote` | `POST .../wallet/engine/swap/quote` | [user-engine-swap-endpoints.md](user-engine-swap-endpoints.md) |
| `get_user_engine_deposit_address` | `GET .../wallet/engine/deposit/address` | [user-engine-swap-endpoints.md](user-engine-swap-endpoints.md) |
| `post_user_engine_withdraw_quote` | `POST .../wallet/engine/withdraw/quote` | [user-engine-swap-endpoints.md](user-engine-swap-endpoints.md) |
| `get_user_engine_token_delegations` | `GET .../wallet/engine/{symbol}/delegations` | [user-waiv-wallet-endpoint.md](user-waiv-wallet-endpoint.md) |
| `get_user_hive_wallet` | `GET .../wallet/hive` | [user-hive-wallet-endpoint.md](user-hive-wallet-endpoint.md) |
| `get_user_hive_hp_delegations` | `GET .../wallet/hive/delegations` | [user-hive-wallet-endpoint.md](user-hive-wallet-endpoint.md) |
| `get_user_hive_rc_delegations` | `GET .../wallet/hive/rc-delegations` | [user-hive-wallet-endpoint.md](user-hive-wallet-endpoint.md) |
| `get_post` | `GET /query/v1/posts/:author/:permlink` | [single-post-endpoint.md](single-post-endpoint.md) |
| `get_post_discussion` | `GET .../discussion` | [post-discussion-endpoint.md](post-discussion-endpoint.md) |
| `get_currency_market` | `GET /query/v1/currency/market` | — |
| `get_currency_fiat_rates` | `GET /query/v1/currency/rates/:base/latest` | — |
| `get_engine_rates` | `GET /query/v1/currency/engine/rates` | — |
| `get_engine_current` | `GET /query/v1/currency/engine/current` | — |
| `get_engine_chart` | `GET /query/v1/currency/engine/chart` | — |
| `get_engine_pools_usd` | `GET /query/v1/currency/engine/pools-usd` | — |
| `search_obl_offers` | `GET /query/v1/obl/offers/search` | [obl.md](obl.md) |
| `get_obl_offer` | `GET /query/v1/obl/offers/:offerId` | [obl.md](obl.md) |
| `get_obl_ledger` | `GET /query/v1/obl/ledger` | [mutual-ledger.md](../../spec/obl/mutual-ledger.md) |
| `get_obl_balance` | `GET /query/v1/obl/balance` | [mutual-ledger.md](../../spec/obl/mutual-ledger.md) |
| `get_obl_service_order` | `GET /query/v1/obl/service-orders/:serviceOrderId` | [service-orders.md](../../spec/obl/service-orders.md) |
| `get_obl_report` | `GET /query/v1/obl/reports/:reportId` | [reports.md](../../spec/obl/reports.md) |
| `convert_usd_to_waiv` | `GET /query/v1/obl/convert/usd-to-waiv` | [payments.md](../../spec/obl/payments.md) |
| `get_channels` | `GET /query/v1/channels` | [osl-messaging.md](osl-messaging.md) |
| `get_channel_by_id` | `GET /query/v1/channels/:id` | [osl-messaging.md](osl-messaging.md) |
| `get_channel_by_alias` | `GET /query/v1/channels/by-alias/:alias` | [osl-messaging.md](osl-messaging.md) |
| `get_channel_messages` | `POST /query/v1/channels/:id/messages` | [osl-messaging.md](osl-messaging.md) |
| `get_object_channel` | `GET /query/v1/objects/:object_id/channel` | [osl-messaging.md](osl-messaging.md) |
| `get_object_channel_messages` | `POST /query/v1/objects/:object_id/channel/messages` | [osl-messaging.md](osl-messaging.md) |
| `check_object_activity_duplicate` | `POST /query/v1/objects/:object_id/channel/activity/dedup-check` | [osl-messaging.md](osl-messaging.md) |
| `get_memo_public_key` | `GET /query/v1/users/:account/memo-public-key` | [osl-messaging.md](osl-messaging.md) |

## Cursor MCP config

```json
{
  "mcpServers": {
    "odl-query": {
      "url": "http://localhost:7000/query/mcp"
    }
  }
}
```

## Verification

```bash
pnpm nx test query-api
pnpm nx build query-api
pnpm check:agent-docs
```

> **TODO: MCP E2E** — add `apps/query-api-e2e` MCP smoke when DB seed + fixture posts exist.
