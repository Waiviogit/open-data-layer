---
id: web-pages-user-profile-routes-transfers
title: User profile — wallet and transfers
description: "Wallet tabs and transfer history under `/@:name/transfers/...`. Wallet primary nav uses `?type=` (e.g. WAIV)."
type: spec
status: active
scope: web
tags: [web, page, user-profile, wallet]
updated_at: 2026-09-24
related:
  - docs/apps/web/spec/pages/user-profile/profile-shell.md
  - docs/apps/web/spec/pages/user-profile/routes/waiv-wallet-history.md
  - docs/apps/web/spec/pages/user-profile/routes/engine-wallet-operations.md
  - docs/apps/web/spec/pages/user-profile/routes/wallet-delegations-modals.md
  - docs/apps/web/spec/pages/user-profile/routes/currency-market-widget.md
---

# User profile — wallet and transfers

**Back:** [profile shell](../profile-shell.md)

## Purpose

Wallet tabs and transfer history under `/@:name/transfers/...`. Wallet primary nav uses `?type=` (e.g. WAIV).

## Routes

| Public URL | App Router file | Layout |
|------------|-----------------|--------|
| `/@:name/transfers` | `(main)/transfers/page.tsx` | main three-column |
| `/@:name/transfers/table` | `(profile)/transfers/table/page.tsx` | single column (full width) — [advanced HIVE report](transfers-table.md) |
| `/@:name/transfers/waiv-table` | `(profile)/transfers/waiv-table/page.tsx` | single column — [WAIV advanced report](transfers-waiv-table.md) |
| `/@:name/transfers/details` | `(main)/transfers/details/page.tsx` | main |
| `/@:name/transfers/details/:reportId` | `(main)/transfers/details/[reportId]/page.tsx` | main |

## Query params

| Param | Values | Effect |
|-------|--------|--------|
| `type` | `WAIV` (default), `HIVE`, `ENGINE` | Wallet tab active state in [user-menu.md](../components/user-menu.md) secondary row |
| `tab` | (waiv-table page only) | In-page tabs on `/@:name/transfers/waiv-table` — not header submenu |

## Current implementation

WAIV tab (`?type=WAIV`): summary card with a tinted header (title + est. account value) above balance rows, and Engine token operations (power up/down, transfer, delegate, manage delegations) for the profile owner. Data from `GET /query/v1/users/{name}/wallet/waiv`. **Paginated WAIV wallet transaction history** loads client-side below the summary from `POST /query/v1/users/{name}/wallet/waiv/history` (page size 20, cursor pagination, infinite scroll). Row mapping and amount rules: [waiv-wallet-history.md](waiv-wallet-history.md). Checkbox **Show author and curators rewards** (default off) toggles inclusion of `comments_*Reward` rows from Hive Engine history RPC.

HIVE tab (`?type=HIVE`): L1 wallet summary (tinted header with title + est. USD, then liquid HIVE, HP, delegations net, RC, savings, HBD, interest) plus **paginated wallet transaction history** below the summary. History data from `POST /query/v1/users/{name}/activity` with `filters: ["wallet"]`, page size 20, cursor pagination, infinite scroll. Data from `GET /query/v1/users/{name}/wallet/hive` for balances. Owner actions use L1 broadcast ops (transfer, vesting, savings, HP/RC delegate, claim interest). See [user-hive-wallet-endpoint.md](../../../../../query-api/spec/user-hive-wallet-endpoint.md). **Started power down** (`withdraw_vesting` start) is unsigned `text-fg` — initiating a power down does not change the balance; weekly `fill_vesting_withdraw` rows stay signed.

**Owner HIVE liquid-row menu (legacy parity):** Power up (primary), Transfer, **Convert to HBD** (`collateralized_convert`, 3.5-day settlement), **Convert to SWAP.HIVE** (opens existing Engine deposit modal), **Withdraw to BTC/LTC/ETH** (Changelly via BFF + client L1 broadcast), Transfer to savings. Deposit to savings (HIVE and HBD) has no recipient field; `transfer_to_savings.to` is the profile account. Changelly flow: BFF `GET/POST /api/users/{name}/wallet/hive/withdraw/*` → query-api → two L1 transfers (pay-in + 0.001 HIVE tracking memo). Spec: [user-hive-changelly-withdraw.md](../../../../../query-api/spec/user-hive-changelly-withdraw.md).

Wallet transaction history is rendered only on this transfers page (not on `HiveWalletTab` export or the activity tab). Legacy-parity card UI lives in `user-wallet/.../hive/history/`.

**Layout:** each balance row shows the amount top-right with the action button **below** the amount (legacy parity). Subtitle stays left under the row title.

**Unavailable state:** when query-api returns `503`, network fails, or the response fails Zod validation, the **summary** shows `t('unavailable')` (or `t('activity_error')` on invalid response) — never a summary card with fake zero balances. **Wallet history** still loads independently when the history API succeeds (degraded mode). Owner wallet modals are disabled while the summary is unavailable.

**Broadcast (WAIV / HIVE / ENGINE):** Keychain signs inline; Hive Engine ops use the **active** key. HiveSigner redirects to hivesigner.com for active-key `custom_json` (no error flash before redirect). After broadcast: trx confirmation → **`revalidateUserWalletAfterBroadcast`** (all wallet summary tags) → **`router.refresh()`** → **`bumpWalletEpoch()`** (refetches client history feeds). Engine token ops also schedule a deferred **`router.refresh()`** (~1.5s) for Hive Engine settlement lag.

**Cache policy:** WAIV/HIVE/ENGINE **summaries** are **`no-store`** on every page load (including F5 and HiveSigner return). **History** is already client `no-store`; it does not refetch on `router.refresh()` alone — only on mount or `walletEpoch` bump. Currency market widget stays on 60s TTL (prices, not account balances).

**Broadcast (HIVE delegations):** HP delegations: `GET /api/users/{name}/wallet/hive/delegations`; RC: `.../rc-delegations`.

**Manage delegations:** status / manage / edit dialogs for WP and HP — see [wallet-delegations-modals.md](wallet-delegations-modals.md). Lists load from `GET /api/users/{name}/wallet/engine/{symbol}/delegations` (WAIV) and `GET /api/users/{name}/wallet/hive/delegations` (HP); cache tags invalidated on wallet broadcast.

**Owner-only:** wallet action buttons and modals render only when `viewerUsername` matches profile `name` (case-insensitive).

**Hive Engine tab (`?type=ENGINE`):** summary of pinned `SWAP.*` pegged tokens plus other Hive Engine token balances, with a tinted grey header (title + est. account value USD) above the token list. Paginated transaction history below the summary from `POST /query/v1/users/{name}/wallet/engine/history` (History API excluding WAIV RPC rows + all indexed swaps). Row mapping: [engine-wallet-history.md](engine-wallet-history.md). API: [user-engine-wallet-endpoint.md](../../../../../query-api/spec/user-engine-wallet-endpoint.md).

**Owner ENGINE operations:** center column is read-only; the right sidebar exposes transfer, power, delegations, swap, deposit, and withdraw for the profile owner. See [engine-wallet-operations.md](engine-wallet-operations.md). BFF routes under `/api/users/{name}/wallet/engine/*`.

Shell hides left/right rails on `waiv-table` and `transfers/table` layouts — see [profile-shell.md](../profile-shell.md).

## Right rail (transfers tab, desktop `lg+`)

On `/@:name/transfers` with the main three-column layout, the right sidebar stacks:

1. **Top wallet actions** (profile owner only) — transfer, power, delegations
2. **Currency market widget** (all viewers) — WAIV / HIVE / HBD prices and sparklines
3. **Bottom wallet actions** (profile owner, **WAIV** or **ENGINE** tab only) — swap, deposit, withdraw

Hidden below `lg`, in Instagram shell, and on advanced table layouts. Full widget spec: [currency-market-widget.md](currency-market-widget.md).

## Verification

Manual: `/@:name/transfers?type=WAIV`, `?type=HIVE`, or `?type=ENGINE` from user menu wallet submenu. Advanced HIVE table: `/@:name/transfers/table` (link: `table_view` on HIVE wallet tab). WAIV advanced report (Standard tab): `/@:name/transfers/waiv-table` (link: `table_view` on WAIV wallet tab).
