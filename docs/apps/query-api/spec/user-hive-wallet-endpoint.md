---
id: query-api-user-hive-wallet-endpoint
title: User HIVE wallet endpoint
description: Live Hive L1 wallet summary and HP/RC delegation lists for the profile wallet tab.
type: spec
status: active
scope: query-api
tags: [query-api, wallet, hive]
updated_at: 2026-09-25
related:
  - docs/apps/web/spec/pages/user-profile/routes/transfers.md
  - docs/apps/chain-indexer/spec/hive-delegations.md
---

# User HIVE wallet endpoint

`GET /query/v1/users/{name}/wallet/hive`

## Purpose

Returns a live Hive L1 wallet summary for the profile account: liquid HIVE, Hive Power, delegations net, resource credits, savings balances, HBD, accrued HBD savings interest, and estimated account value in USD.

## Related endpoints

| Path | Purpose |
|------|---------|
| `GET .../wallet/hive/delegations` | HP delegations: incoming/outgoing from `user_delegations` (indexed), expirations from chain RPC |
| `GET .../wallet/hive/rc-delegations` | RC delegations: incoming from `user_rc_delegations`, outgoing from `rc_api` |
| `GET .../wallet/hive/withdraw/range` | Changelly min/max/rate for liquid HIVE → BTC/LTC/ETH — see [user-hive-changelly-withdraw.md](user-hive-changelly-withdraw.md) |
| `POST .../wallet/hive/withdraw/estimate` | Changelly output estimate for a HIVE amount |
| `POST .../wallet/hive/withdraw/create` | Create Changelly pay-in routing (client broadcasts L1 transfers) |

## Data sources

- `condenser_api.get_accounts` — balances, vesting, savings, power-down fields (`to_withdraw`, `withdrawn`, `vesting_withdraw_rate`)

## Power down weeks

`powerDown.weeksRemaining` is `round((to_withdraw - withdrawn) / vesting_withdraw_rate)`, clamped to `0…13`. Hive keeps `to_withdraw` at the original total; progress lives in `withdrawn`.
- `rc_api.find_rc_accounts` — max RC
- `condenser_api.get_savings_withdraw_from` — pending savings withdrawals
- `condenser_api.get_dynamic_global_properties` — `hbd_interest_rate`
- `HiveGlobalPropertiesCache` — vest-to-HP conversion
- `user_delegations` — indexed HP delegation pairs (chain-indexer + mongo import)
- `user_rc_delegations` — indexed RC delegation incoming pairs
- `rc_api.list_rc_direct_delegations` — outgoing RC delegations
- `CurrencyQueryService.marketInfo` — HIVE/HBD USD rates

## Delegatable HP

`balance.delegatableHp` is vest-to-HP of `max(0, vesting_shares − delegated_vesting_shares − max(0, to_withdraw − withdrawn))`. Received vesting is not included. Integer `to_withdraw` / `withdrawn` are micro-VESTS.

## Errors

| Status | When |
|--------|------|
| `404` | No `accounts_current` row for `name` |
| `503` | Hive node RPC unavailable |

## Interest claim eligibility

`interest.canClaim` is `true` when `savings_hbd_last_interest_payment` is the epoch sentinel or at least 30 days have passed since the last payment.

## Verification

```bash
pnpm nx test query-api --testPathPatterns=hive-wallet
curl -s "http://localhost:3001/query/v1/users/flowmaster/wallet/hive" | jq .
curl -s "http://localhost:3001/query/v1/users/flowmaster/wallet/hive/delegations" | jq '{incoming: .incoming | length, outgoing: .outgoing | length, expirations: .expirations | length}'
curl -s "http://localhost:3001/query/v1/users/flowmaster/wallet/hive/rc-delegations" | jq '{incoming: .incoming | length, outgoing: .outgoing | length}'
```

## HP delegations response (`GET .../wallet/hive/delegations`)

| Field | Type | Description |
|-------|------|-------------|
| `account` | string | Profile account name |
| `incoming` | array | Delegations **to** this account (`user_delegations` where `delegatee` = account) |
| `incoming[].delegator` | string | Delegator account |
| `incoming[].delegatee` | string | Delegatee account |
| `incoming[].vestingShares` | string | Raw VESTS amount |
| `incoming[].hp` | string | HP display (vest conversion) |
| `incoming[].minDelegationTime` | string | ISO timestamp or empty |
| `outgoing` | array | Delegations **from** this account |
| `expirations` | array | Pending undelegations from chain RPC |
| `expirations[].delegator` | string | Account returning HP |
| `expirations[].vestingShares` | string | VESTS being returned |
| `expirations[].hp` | string | HP display |
| `expirations[].completionDate` | string | ISO completion time |

## RC delegations response (`GET .../wallet/hive/rc-delegations`)

| Field | Type | Description |
|-------|------|-------------|
| `account` | string | Profile account name |
| `incoming` | array | RC received (`user_rc_delegations` where `delegatee` = account) |
| `incoming[].from` | string | Delegator account |
| `incoming[].delegatedRc` | number | RC amount (raw units) |
| `outgoing` | array | RC delegated out (`rc_api.list_rc_direct_delegations`) |
| `outgoing[].to` | string | Delegatee account |
| `outgoing[].delegatedRc` | number | RC amount (raw units) |
