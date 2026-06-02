# WAIV power (`user_object_powers`)

**Back:** [Spec index](README.md) · **Related:** [vote-semantics](vote-semantics.md)

## Purpose

- **`waiv_power`**: 30-day time-weighted rolling average used as voting weight for ODL **validity** (community tier) and **rank** (average and community fallback).
- **`raw_waiv_power`**: live Hive Engine WAIV `stake + delegationsIn` for tracked accounts.
- Source: Hive Engine **`tokens` / `balances`** row for symbol **WAIV**.

`object_reputation` on `accounts_current` is **not** used for update validity or rank math.

## Table: `user_object_powers`

| Column | Type | Description |
|--------|------|-------------|
| `account` | TEXT PK | Hive account |
| `waiv_power` | DOUBLE PRECISION | 30-day time-weighted average (updated daily by scheduler) |
| `raw_waiv_power` | DOUBLE PRECISION | Live `stake + delegationsIn` (WAIV) |
| `waiv_power_dirty` | BOOLEAN | Set when `raw_waiv_power` changes; cleared after daily snapshot |

Only accounts that **participate** in object governance voting (ODL paths below) get a row.

## Table: `user_waiv_power_history`

Event-sourced snapshots of `raw_waiv_power` used to compute the rolling average.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL PK | Surrogate key |
| `account` | TEXT | Hive account |
| `waiv_power` | DOUBLE PRECISION | Snapshot of `raw_waiv_power` at `recorded_at` |
| `recorded_at` | TIMESTAMPTZ | Snapshot time (typically daily cron) |

## Indexer: `user_object_powers.create`

Emitted (in-process event) when the posting account acts in:

- `object_create`
- `update_create`
- `update_vote`
- `rank_vote`

**Handler:** if `account` already exists → no-op. Else call Hive Engine `contracts` `findOne` on `tokens` / `balances` with `{ symbol: 'WAIV', account }`, set `raw_waiv_power = waiv_power = stake + delegationsIn`, **insert** row.

## Indexer: `user_object_powers.update`

Emitted when the Hive Engine **block parser** sees **`tokens`** contract log events for **WAIV**.
Deltas apply to `raw_waiv_power` (`stake + delegationsIn`). Failed transactions produce no log events and are skipped silently.

| Log event | Tx action | Account | Delta on `raw_waiv_power` |
|-----------|-----------|---------|------------------------|
| `stake` | `stake` (user) | `data.account` | `+quantity` |
| `delegate` | `delegate` (user) | `tx.sender` | `-quantity` |
| `delegate` | `delegate` (user) | `data.to` | `+quantity` |
| `undelegateStart` | `undelegate` (user) | `data.from` | `-quantity` |
| `unstake` | `checkPendingUnstakes` (virtual) | `data.account` | `-quantity` |
| `undelegateDone` | `checkPendingUndelegations` (virtual) | `data.account` | `+quantity` |

**Not tracked:** `unstakeStart`, `unstakeCancel`, user `unstake` / `cancelUnstake` actions (no immediate `stake + delegationsIn` change at user tx time).

**Handler:** if `account` **not** in table → no-op. Else increment `raw_waiv_power` by delta (clamp at `0`), set `waiv_power_dirty = TRUE`. **`waiv_power` is not updated immediately.**

**Object updates and rank_score are not recalculated** on these events (stale rank until the next `rank_vote` or explicit recompute policy).

## Scheduler: daily rolling average (`waiv-power-avg`)

Job name: `waiv-power-avg`. Schedule: `30 3 * * *` (daily 03:30 UTC).

Three steps:

1. **Snapshot dirty users** — insert `raw_waiv_power` into `user_waiv_power_history`, clear `waiv_power_dirty`.
2. **Recompute averages** — for accounts with history in the last 30 days, compute time-weighted average and write to `waiv_power`.
3. **Prune** — delete history rows older than 32 days, keeping the latest row per account as anchor.

### Time-weighted average semantics

Over a 30-day window ending at `now`:

- Take the latest history row **before** the window as anchor (value held from `window_start` until first in-window change).
- Each in-window snapshot starts a new segment until the next change or `now`.
- Average = `Σ (value × duration) / Σ duration`.

Example: stable at 200 for 29 days, then stake to 20 200 on day 30 → next-day average ≈ `(200×29 + 20200×1) / 30 ≈ 866`. Over subsequent days the average ramps toward 20 200 even without further stake events.

Stable users (no changes for 30+ days) keep a constant average equal to their last known value.

## Query pipeline

`AggregatedObjectRepository` loads `user_object_powers.waiv_power` for distinct **validity** voters (not rank-voters at read time; rank is already on `object_updates`).
