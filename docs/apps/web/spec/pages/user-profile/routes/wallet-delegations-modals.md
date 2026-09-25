---
id: web-pages-user-profile-routes-wallet-delegations-modals
title: Wallet delegations modals (web)
description: Status, manage, and edit delegation dialogs for WAIV power and Hive Power on the transfers tab.
type: spec
status: active
scope: web
tags: [web, page, user-profile, wallet, delegations]
updated_at: 2026-09-25
related:
  - docs/apps/web/spec/pages/user-profile/routes/transfers.md
  - docs/apps/web/spec/pages/user-profile/routes/engine-wallet-operations.md
  - docs/apps/query-api/spec/user-waiv-wallet-endpoint.md
  - docs/apps/query-api/spec/user-hive-wallet-endpoint.md
---

# Wallet delegations modals (web)

**Back:** [transfers](transfers.md)

## Purpose

Three related dialogs on the profile wallet tab (`/@:name/transfers`) for viewing and editing outgoing delegations of **WAIV Power (WP)** and **Hive Power (HP)**.

| Dialog | Component | Entry |
|--------|-----------|-------|
| Status | `WalletDelegationsListModal` | Click delegations amount on WAIV / HIVE summary row |
| Manage | `WalletManageDelegationsModal` | Sidebar **Manage delegations** (owner) |
| Edit | `WalletEditDelegationModal` | **Edit** on a row in Manage (nested; no new global modal kind) |

RC delegations use the status dialog only (`hiveRc` variant); manage/edit covers WP and HP.

## Status dialog

**File:** `apps/web/src/modules/user-wallet/presentation/components/wallet/wallet-delegations-list-modal.tsx`

### Variants

| `variant` | Title i18n | Amount suffix |
|-----------|------------|---------------|
| `waiv` | `wallet_waiv_power_delegations` | WP |
| `hiveHp` | `wallet_hive_delegations` | HP |
| `hiveRc` | `wallet_rc_delegations` | b RC |

### Layout

- Visible `<h2>` title (not sr-only).
- **Received** / **Delegated** tabs with tab totals (`formatDelegationTabTotal`).
- Single scroll region (`min-h-0 flex-1 overflow-y-auto`) for long account lists.
- Empty state: `your_list_is_empty` when both tabs have no rows.

### Data

| Variant | BFF route |
|---------|-----------|
| `waiv` | `GET /api/users/{name}/wallet/engine/WAIV/delegations` |
| `hiveHp` | `GET /api/users/{name}/wallet/hive/delegations` |
| `hiveRc` | `GET /api/users/{name}/wallet/hive/rc-delegations` |

HP status includes **expirations** (pending undelegations) in the Delegated tab; manage does not list expirations (not editable).

## Manage dialog

**File:** `apps/web/src/modules/user-wallet/presentation/components/wallet/wallet-manage-delegations-modal.tsx`

- **Outgoing only** — no Received section.
- Asset selector (when both WAIV and HIVE available): `WAIV Power (WP)` / `HIVE Power (HP)` via `getWalletManageDelegationsAssetLabel`.
- Header: `wallet_delegations_delegated`: **{total} {WP|HP}** (outgoing sum only).
- Each row: account card + **Edit** button.
- Scrollable outgoing list; load error uses `wallet_delegations_load_error`.
- Escape / backdrop close is suppressed while the nested edit dialog is open.

## Edit dialog

**File:** `apps/web/src/modules/user-wallet/presentation/components/wallet/wallet-edit-delegation-modal.tsx`

Nested modal (`zIndex = APP_MODAL_Z_INDEX + 1`). Local state in manage: `{ asset, delegatee, currentQuantity }`.

### UI

- Title: `wallet_edit_delegation_title`
- Read-only `@delegatee`
- Amount field (WP/HP suffix fixed; no asset selector)
- USD estimate (`wallet_transfer_value_usd`)
- **Available** max line
- Footer: `wallet_delegate_timing`, `wallet_broadcast_approval_note` (provider-agnostic approval hint)
- Primary: `wallet_edit_delegation_update` (disabled when amount unchanged or invalid)

### Max editable amount

Domain: `getWalletEditDelegationMaxAmount` in `wallet-edit-delegation.ts`.

| Asset | Formula |
|-------|---------|
| **WAIV** | `(stake + delegationsOut) - sum(other outgoing)` |
| **HP** | `delegatableHp + this row's HP` when the summary includes `delegatableHp` (`own VESTS − outgoing delegation − remaining power down`). Otherwise `hivePower − sum(other outgoing HP)`. The new-delegate dialog uses the same max for a recipient who already has an outgoing HP row, and shows `wallet_hive_delegate_replaces`: the amount is the new total, because Hive replaces that delegation instead of adding to it. An unchanged total is rejected (`wallet_validation_delegation_unchanged`). |

### Broadcast on Update

| Asset | Change | Op |
|-------|--------|-----|
| WAIV | increase | `delegate` delta quantity |
| WAIV | decrease | `undelegate` delta quantity |
| WAIV | `0` | `undelegate` full current |
| HP | any valid new | `delegate_vesting_shares` absolute vesting for delegatee |
| HP | `0` | undelegate (`0.000000 VESTS`) |

Hooks: `useEngineTokenBroadcast` / `useHiveBroadcast`. On success: reload manage list + close edit; wallet summary revalidates via existing broadcast hooks.

## Shared domain helpers

- `wallet-delegations-format.ts` — parse, tab totals, sort outgoing
- `wallet-edit-delegation.ts` — max amount, WAIV delta ops, HP change detection

## Verification

```bash
pnpm nx run web:typecheck
pnpm nx test web --testPathPatterns="wallet-delegations-format|wallet-edit-delegation"
```

Manual (profile owner): WAIV tab → status title + scroll; Manage → Edit → change amount / undelegate to zero. HIVE tab: same flow; Update disabled when HP unchanged; Escape closes edit only.
