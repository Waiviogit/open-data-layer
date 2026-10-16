---
id: docs-apps-query-api-spec-users-account-sidebar
title: User account sidebar
description: Aggregated profile left-rail data — metadata, mana, RC, and vote value estimates.
type: spec
status: active
scope: query-api
tags: [query-api, users, account-sidebar]
updated_at: 2026-10-16
related:
  - docs/apps/query-api/spec/users-profile-endpoint.md
  - docs/apps/web/spec/pages/user-profile/components/account-sidebar.md
---

# User account sidebar

**Back:** [User profile](users-profile-endpoint.md)

## HTTP

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/query/v1/users/:name/account-sidebar` | Legacy `UserInfo` parity for the profile left rail. |

Returns `404` when `accounts_current` has no row for `name`.

## Response: `UserAccountSidebarView`

| Field | Source |
|-------|--------|
| `about`, `location`, `website`, `email` | `posting_json_metadata.profile` — **live Hive chain preferred** over Postgres (legacy `getInfoForSideBar`) |
| `socialLinks[]` | Non-empty social ids on `profile` (legacy `SocialLinks` / `socialProfiles`) |
| `cryptoWallets[]` | BTC/LTC/ETH/Lightning addresses from `profile` (`bitcoin`, `litecoin`, `ethereum`, `lightningBitcoin`) |
| `joinedAt` | `accounts_current.created` (ISO string); often `null` after mongo-migrate until chain-indexer `upsertFromHive` sets `created` |
| `expertiseWeight` | `accounts_current.wobjects_weight` |
| `lastActivityAt` | `accounts_current.last_activity` (unix → ISO), fallback `created` |
| `totalVoteValueUsd` | `hive.voteValueUsd + waiv.voteValueUsd` |
| `waiv.*` | Hive Engine voting power + WAIV stake + reward pool rate + diesel pool price |
| `hive.reputation` | Chain `get_accounts.reputation` (legacy steem formatter) |
| `hive.upvotingManaPercent` / `downvotingManaPercent` | Regenerated Hive VP / downvote manabar |
| `hive.resourceCreditsPercent` | `rc_api.find_rc_accounts` current / max |
| `hive.voteValueUsd` / `waiv.voteValueUsd` | Legacy `userInfoCalc` formulas |

### `cryptoWallets[]` item

| Field | Description |
|-------|-------------|
| `id` | Profile key (`bitcoin`, `litecoin`, `ethereum`, `lightningBitcoin`) |
| `label` | Display name |
| `shortName` | Short display name |
| `abbreviation` | Ticker (`BTC`, `LTC`, `ETH`, `LBTC`) |
| `address` | On-chain / Lightning address from profile |
| `icon` | Legacy icon filename |
| `coingeckoId` | CoinGecko id for USD estimate (`bitcoin` for Lightning) |

Chain/Engine RPC failures degrade to zero mana/vote fields. **Metadata:** when Hive `get_accounts` succeeds, `posting_json_metadata` from chain is preferred over Postgres; Postgres is used only when the RPC fails (degraded path).

## Caches

| Key | TTL | Purpose |
|-----|-----|---------|
| `query-api:cache:hive:account:{name}` | 60s | Condenser `get_accounts` snapshot — dedupes profile + account-sidebar on the same page load |
| `query-api:cache:reward-fund:hive` | 60s | `reward_balance / recent_claims` |
| `query-api:cache:waiv:reward-pool` | 60s | Engine pool `rewardPool / pendingClaims` |
| `query-api:cache:waiv:diesel-pool` | 60s | Global WAIV/HIVE diesel `quotePrice` (not per-account) |

Prices: `CurrencyQueryService` (Postgres-backed HIVE/USD + WAIV/USD).

## Indexer dependency

`lastActivityAt` is populated by chain-indexer batch `touchLastActivity` at end of each parsed block. Until backfill, falls back to `joinedAt`.

## Verification

```bash
pnpm nx test query-api --testPathPatterns=account-sidebar
curl -s http://localhost:7000/query/v1/users/demo/account-sidebar
```
