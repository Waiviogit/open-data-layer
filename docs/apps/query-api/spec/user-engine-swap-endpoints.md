---
id: query-api-user-engine-swap-endpoints
title: User ENGINE swap / deposit / withdraw endpoints
description: Hive Engine market swap quotes, converter deposit routing, and multi-hop withdraw quotes.
type: spec
status: active
scope: query-api
tags: [query-api, wallet, hive-engine]
updated_at: 2026-07-07
related:
  - docs/apps/query-api/spec/user-engine-wallet-endpoint.md
  - docs/apps/web/spec/pages/user-profile/routes/engine-wallet-operations.md
  - docs/skills/hive-engine-deposit-for-agents.md
---

# User ENGINE swap / deposit / withdraw endpoints

## External limits

| Source | Limit | Risk |
|--------|-------|------|
| `findMarketPools({ limit: 1000 })` | 1000 pools | Rare truncation on swap quote / WAIV withdraw path |
| `findTokenBalances({ limit: 1000 })` | 1000 rows | Large accounts may miss balances in list endpoints |
| Swap list token metadata | `$in` balance symbols only | Pair counter-symbols use pool precision from adjacency |

List endpoints use `findStrict` where noted below so RPC failures return **503** instead of empty data.

## Environment

| Variable | Used by |
|----------|---------|
| `HIVE_SWAP_ACCOUNT` | HIVE deposit hivepegged routing (default `honey-swap`) |
| Converter API | `HiveEngineConvertClient` base URL (see clients lib) |

## Disabled pegged token (`SWAP.ETH`)

`SWAP.ETH` is **excluded** from the ENGINE wallet balance tab (`pinnedTokens` and `tokens`) and from deposit, withdraw, and swap list/quote endpoints. Blocklist: `ENGINE_DISABLED_PEGGED_SWAP_SYMBOLS` in `@opden-data-layer/core/hive-engine-history`. L1 **ETH** deposit and **WAIV→ETH** / **SWAP.ETH→ETH** withdraw are rejected.

## Swap list

`GET /query/v1/users/:name/wallet/engine/swap/list`

Returns swappable HE tokens for the account with pool adjacency and balances. Uses strict Hive Engine reads for pools and balances.

## Swap quote

`POST /query/v1/users/:name/wallet/engine/swap/quote`

Body: `{ fromSymbol, toSymbol, amountIn, direction?, slippage? }`

Returns AMM quote only (`amountOut`, `minAmountOut`, `priceImpact`, `customJson[]`). **Does not** run withdraw fee/min validation.

## Deposit list

`GET /query/v1/users/:name/wallet/engine/deposit/list`

MCP: `get_user_engine_deposit_list`.

Returns depositable external/Hive tokens from `converter-api.hive-engine.com/api/pairs/` + `/api/coins/`, plus manual **HIVE** (hivepegged). Returns **503** when converter-api is unavailable.

## Deposit address

`GET /query/v1/users/:name/wallet/engine/deposit/address?symbol=<TOKEN>`

MCP: `get_user_engine_deposit_address`.

Returns deposit routing instructions:

- **HIVE** — fixed Hive L1 route via `hivepegged` buy to `HIVE_SWAP_ACCOUNT` (default `honey-swap`); memo is the hivepegged JSON payload.
- **BTC, LTC, HBD** — proxied from `converter-api.hive-engine.com/api/convert/` (`address` and/or `account` + `memo`). **ETH** is not supported (disabled pegged token).

Response fields: `symbol`, `account` (Hive Engine swap account or null), `memo`, `address`, `pair`, `exRate`, `swapSymbol` (e.g. `SWAP.BTC`), `destination` (profile account). `account` is **not** the user.

This endpoint does **not** write `hive_engine_deposit` history. Agents must broadcast OSL `hive_engine_deposit` via agent-wallet `osl_build_hive_engine_deposit` + `wallet_broadcast` (`keyType: posting`) before showing the address. Skill: [hive-engine-deposit-for-agents.md](../../skills/hive-engine-deposit-for-agents.md).

## Withdraw list

`GET /query/v1/users/:name/wallet/engine/withdraw/list`

Returns withdraw routes from converter-api pairs + manual routes (`SWAP.HIVE`→`HIVE`, `WAIV`→`BTC|LTC|HBD|HIVE`), filtered to tokens with balance > 0. Uses strict balance read. Routes involving `SWAP.ETH` or L1 **ETH** are omitted.

## Withdraw quote

`POST /query/v1/users/:name/wallet/engine/withdraw/quote`

Body: `{ inputSymbol, outputSymbol, quantity, address?, previewOnly? }`

- **`previewOnly`** — when `true` (or when `address` is omitted), returns predictive amount and validation errors without building final withdraw `customJson`.
- **`errorCode` / `errorParams`** — structured validation (`minimum_withdraw_amount`, `minimum_receive_amount`) for web i18n.

Routes:

- **WAIV** input — multi-hop swap + final withdraw leg.
- **SWAP.*** input — direct withdraw (`hivepegged` for `SWAP.HIVE`→`HIVE`, converter routing for external chains).
