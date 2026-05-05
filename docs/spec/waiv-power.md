# WAIV power (`user_object_powers`)

**Back:** [Spec index](README.md) · **Related:** [vote-semantics](vote-semantics.md)

## Purpose

- **`waiv_power`**: voting weight for ODL **validity** (community tier) and **rank** (average and community fallback).
- Source: Hive Engine **`tokens` / `balances`** row for symbol **WAIV** — `stake + delegationsIn` (same as product contract for “effective stake”).

`object_reputation` on `accounts_current` is **not** used for update validity or rank math.

## Table: `user_object_powers`

| Column | Type | Description |
|--------|------|-------------|
| `account` | TEXT PK | Hive account |
| `waiv_power` | DOUBLE PRECISION | Cached `stake + delegationsIn` (WAIV) |

Only accounts that **participate** in object governance voting (ODL paths below) get a row.

## Indexer: `user_object_powers.create`

Emitted (in-process event) when the posting account acts in:

- `object_create`
- `update_create`
- `update_vote`
- `rank_vote`

**Handler:** if `account` already exists → no-op. Else call Hive Engine `contracts` `findOne` on `tokens` / `balances` with `{ symbol: 'WAIV', account }`, set `waiv_power = stake + delegationsIn`, **insert** row.

## Indexer: `user_object_powers.update`

Emitted when the Hive Engine **block parser** sees **`tokens`** contract actions for **WAIV**:

| Action | Accounts | Delta on `waiv_power` |
|--------|----------|------------------------|
| `stake` | `payload.account` | `+quantity` |
| `unstake` | `payload.account` | `-quantity` |
| `delegate` | `payload.from` | `-quantity` |
| `delegate` | `payload.to` | `+quantity` |
| `undelegate` | `payload.from` | `+quantity` |
| `undelegate` | `payload.to` | `-quantity` |

**Handler:** if `account` **not** in table → no-op. Else **increment** `waiv_power` by delta; clamp at `0` (`GREATEST(0, waiv_power + delta)`).

**Object updates and rank_score are not recalculated** on these events (stale rank until the next `rank_vote` or explicit recompute policy).

## Query pipeline

`AggregatedObjectRepository` loads `user_object_powers` for distinct **validity** voters (not rank-voters at read time; rank is already on `object_updates`).
