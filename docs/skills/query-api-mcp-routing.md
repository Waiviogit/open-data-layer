---
title: Query API MCP routing for agents
description: First-visit map for query-api MCP live-data tools and how they differ from knowledge-api docs search.
type: skill
status: active
scope: platform
tags: [query-api, mcp, agent, routing, live-data]
updated_at: 2026-08-20
related:
  - docs/apps/query-api/spec/mcp.md
  - docs/apps/query-api/spec/overview.md
  - docs/apps/query-api/spec/obl.md
  - docs/apps/query-api/spec/objects-resolve-nested.md
  - docs/skills/knowledge-api-routing.md
  - docs/skills/osl-messaging.md
  - docs/skills/wallet-delegation-swap-for-agents.md
  - docs/skills/hive-account-authority-for-agents.md
  - docs/skills/obl-offers-contracts.md
  - docs/skills/obl-ledger.md
  - docs/skills/obl-disputes.md
  - docs/skills/build-tenant-site.md
  - docs/README.md
---

# Query API MCP routing for agents

## When to use

- You need **live platform data** (objects, users, posts, feeds, shop listings, currency rates, **OBL** offers/ledger).
- You are connected to **query-api** MCP (`POST /query/mcp`).
- You already know what to fetch and need the right tool name or HTTP parity.

## When not to use

- You need **how/why** a feature works — use **knowledge-api** (`search_knowledge`, `resolve_doc`, `docs/apps/query-api/spec/`).
- OBL **write** workflows (publish, sign, invoice, pay, dispute) — knowledge skills `obl-offers-contracts`, `obl-ledger`, `obl-disputes` + broadcast.
- You need to **write** drafts or authenticated mutations — not exposed via MCP.
- You confuse `search` (live) with `search_knowledge` (indexed docs) — they are different servers.

## First visit steps

1. Read MCP **server instructions** on `initialize` or resource `odl-query://routing`.
2. Read `odl-query://catalog/tools` — JSON tool list with HTTP equivalents.
3. Pick a tool from the decision table below.
4. Pass `locale`, `viewer`, `governance_object_id` when personalization or governance masking matters.

## Decision table

| User intent | Tool |
|-------------|------|
| Header / quick lookup | `search`, `search_counts` |
| Discover browse by type/tags | `discover_objects`, `discover_tag_categories` |
| Object detail projection | `resolve_object` |
| Nested menu / catalog items (batch) | `resolve_nested_objects` |
| Related / similar / add-on rails | `get_object_related`, `get_object_similar`, `get_object_add_on` |
| Object gallery Related album | `get_object_related_album_preview`, `get_object_related_album` |
| Object update history | `get_object_updates` |
| User profile shell | `get_user_profile` |
| User feeds | `get_user_blog`, `get_user_threads`, `get_user_comments`, `get_user_mentions` |
| User shop | `get_user_categories`, `get_user_shop_objects`, `get_user_shop_sections` |
| Post + comment tree | `get_post`, `get_post_discussion` |
| Rates / rewards display | `get_currency_*`, `get_engine_*` |
| OBL offer search / detail | `search_obl_offers`, `get_obl_offer` |
| OBL contract by id | `get_obl_contract` |
| OBL pair ledger / balance | `get_obl_ledger`, `get_obl_balance` |
| OBL relationships list | `get_obl_relationships` |
| OBL arbitration inbox | `get_obl_arbitration` |
| USD → WAIV conversion hint | `convert_usd_to_waiv` |
| Messaging inbox / channels | `get_channels`, `get_channel_by_id`, `get_channel_messages` |
| Object channel feed | `get_object_channel`, `get_object_channel_messages` (authors-only activity: `authors_only`) |
| Followed objects message feed | `get_followed_objects_messages` (authors-only activity: `authors_only`) |
| Memo key for encrypt | `get_memo_public_key` |
| Hive L1 wallet summary | `get_user_hive_wallet` |
| HP / RC delegation lists | `get_user_hive_hp_delegations`, `get_user_hive_rc_delegations` |
| WAIV / Engine balances | `get_user_waiv_wallet`, `get_user_engine_wallet` |
| Engine token delegations | `get_user_engine_token_delegations` (symbol e.g. `WAIV`) |
| Engine swaps / withdraw quotes | `get_user_engine_swap_list`, `post_user_engine_swap_quote`, `post_user_engine_withdraw_quote` |
| Who delegated authority to me / who can I post as | `get_user_authority_grantors` (404 = account absent from indexer, not “no grantors”) |
| Who did this account delegate authority to | `get_user_authority_grantees` |
| Build / broadcast delegations | Not in query-api MCP — [wallet-delegation-swap-for-agents](wallet-delegation-swap-for-agents.md) + **agent-wallet** (`hive_build_*`, `engine_build_*`, `wallet_broadcast`) |
| Grant/revoke posting authority / act as grantor | Not in query-api MCP — [hive-account-authority-for-agents](hive-account-authority-for-agents.md) + **agent-wallet** (`hive_build_posting_authority_grant`, `hive_build_post`, `wallet_broadcast`) |
| Send / encrypt / inbound notify | Not in query-api MCP — use [osl-messaging](osl-messaging.md) skill + **agent-wallet** (`osl_build_*`, `wallet_broadcast`, `notifications_pull`) |

## Contrast with knowledge-api

| | query-api MCP | knowledge-api MCP |
|--|---------------|-------------------|
| Data | Live DB / Hive | Indexed markdown specs |
| Search tool | `search` | `search_knowledge` |
| Object shape docs | `resolve_object` returns data | `get_object_type` / specs |
| Onboarding | `odl-query://routing` | `odl-knowledge://routing` |

## MCP resources

| URI | Content |
|-----|---------|
| `odl-query://routing` | This routing map |
| `odl-query://catalog/tools` | Tool catalog JSON |

Canonical detail: [query-api MCP spec](../apps/query-api/spec/mcp.md).

## Verification

- `tools/list` on `POST /query/mcp` includes `resolve_object`, `search`, `get_post_discussion`, `search_obl_offers`, `get_obl_balance`.
- Resource `odl-query://catalog/tools` lists all registered tools (includes OBL tools above).
- OBL write playbooks: [obl-offers-contracts](obl-offers-contracts.md), [obl-ledger](obl-ledger.md), [obl-disputes](obl-disputes.md).
