# Vote semantics: query-time validity and rank resolution

**Back:** [Spec index](README.md) · **Related:** [governance-resolution](governance-resolution.md), [object-type-entity](object-type-entity.md), [reject-codes](reject-codes.md), [waiv-power](waiv-power.md)

Votes are stored as neutral raw events by the Indexer Service.
All role-based interpretation is resolved in Query/Masking Service using governance context/snapshot.

## A) Validity channel (`update_vote`)

### Storage model

- One active raw validity vote per `(update_id, voter)`.
- `vote = for|against` creates/replaces current vote for the same key.
- `vote = remove` clears current vote for the same key (idempotent no-op if vote does not exist).
- Indexer stores raw vote payload and canonical event metadata only.

### Payload contract (logical)

- ODL id: `odl-mainnet` (or `odl-testnet`)
- Event envelope item:
  - `action = update_vote`
  - `v`
  - `payload` (contains fields below)
- Required fields:
  - `update_id`
  - `voter`
  - `vote` (`for`, `against`, `remove`)

### Query-time decisive resolution

Validity is derived at query time with tiered hierarchy:

1. Latest `admin` wins (LWAW).
2. If no admins vote exists, latest `trusted` wins, but only on objects he has authority update (LWTW).
3. If no decisive admin/trusted vote exists (including after `remove`), apply community vote weight (see [section C](#c-community-vote-weight)).
4. If no community votes exist either, fallback is baseline `VALID`.

`latest` is determined by `event_seq DESC` — a packed BIGINT encoding `(block_num, trx_index, op_index, odl_event_index)`. See `libs/core/src/event-seq.ts` for the encoding layout.

### Output

- Query layer derives `final_status` (`VALID` or `REJECTED`) from decisive validity vote:
  - `for` → `VALID`
  - `against` → `REJECTED`
- Indexer does not persist authoritative `final_status` from role logic.

## B) Ranking channel (`rank_vote`)

`rank_vote` is a separate operation and does not mutate `final_status`.

### Payload contract (logical)

- ODL id: `odl-mainnet` (or `odl-testnet`)
- Event envelope item:
  - `action = rank_vote`
  - `v`
  - `payload` (contains fields below)
- Required fields:
  - `update_id`
  - `voter`
  - `rank` (`0..10000`)
- Optional:
  - `rank_context` (default `default`)

### Storage model

- One active raw rank vote per `(update_id, voter, rank_context)`.
- Revote replaces previous vote for the same key.
- `rank_vote` is allowed only for updates whose target `update_type` has `multi` cardinality (per the update registry).
- If the target `update_type` has `single` cardinality, event must be rejected with `UNSUPPORTED_RANK_TARGET`.

### Persisted `rank_score` (indexer)

Per update row (`object_updates`), the Indexer **writes** (and refreshes on each new `rank_vote` for that `update_id`):

- `rank_score` (`0..10000`, nullable when no votes)
- `rank_context` (nullable; e.g. decisive context, or null for weighted-average aggregation)
- `rank_decisive_event_seq` (nullable; `event_seq` of the decisive rank vote for tie-breaks at read time)

Computation uses the same governance snapshot as ranking resolution (platform governance in indexer) and per-voter **waiv_power** from [`user_object_powers`](waiv-power.md). See `computeUpdateRankPersistence` in `@opden-data-layer/objects-domain`.

### Default aggregation (`rank_aggregation` omitted or `winner`)

Parallel to validity admin/trusted tiers:

1. Latest `admin` rank wins (LWAW) — highest `event_seq` among admin rank votes for that `update_id`.
2. Else latest `trusted` rank wins (LWTW) — highest `event_seq` among trusted rank votes for that `update_id`.
3. **Else (community rank votes only):** take the **`rank` value** from the vote whose voter has the **highest** `waiv_power` in `user_object_powers`; ties break by **larger** rank vote `event_seq`.

This is **not** “compare rank votes to the update itself”; it is the same style of tiered list as validity (admins/trusted list, then stake-weighted community).

### Average aggregation (`rank_aggregation = average`)

Weighted mean of all rank votes for that `update_id`:

```
weight_i = waiv_power_i > 1 ? waiv_power_i : 1
rank_score = round( Σ (rank_i × weight_i) / Σ weight_i )
```

`rank_context` and `rank_decisive_event_seq` are null for this mode.

### Query-time ordering (multi-cardinality)

Query layer orders **VALID** updates using persisted fields on `object_updates`:

1. `rank_score` ASC (nulls last)
2. `rank_decisive_event_seq` DESC (nulls last)
3. `event_seq` (update row) DESC
4. `update_id` ASC

Raw `rank_votes` rows are not loaded for resolution; they remain the audit trail.

### Tie-break for single-cardinality field winner

When multiple **VALID** candidates remain for an `update_type` with `cardinality: single` (after locale preference where applicable), the Query layer picks one winner. Ordering is **not** “highest `object_updates.event_seq` first” globally; that column is used in a **late** deterministic tie-break (see step 4 below).

Order (first difference wins):

1. **Validity tier** from per-update resolution (§A / §C): `admin` > `trusted` > `community` > `baseline`. Rows resolved only via the **curator filter** carry no `validity_tier` in code (`null`) and rank like `baseline` for this step.

2. **Admin or trusted tier:** larger **`event_seq` of the decisive validity vote** for that `update_id` (same LWAW / LWTW rule as §A — latest admin vote, or latest trusted vote with authority). Among competing updates **both** in the admin tier, the one whose **decisive admin validity vote** has the **later** `event_seq` wins the field.

3. **Community tier:** larger signed **`field_weight`**, then larger **`approve_percent`**.

4. Otherwise (baseline tier, curator `null` tier, or ties above): larger **`object_updates.event_seq`**, then larger **`created_at_unix`**, then **`update_id` ASC** (lexicographically smallest).

Reference implementation: `compareResolvedSingleCardinality` in `@opden-data-layer/objects-domain`.

## C) Community vote weight

When no admin or trusted decisive vote exists for an update, the **community vote weight** system determines validity. This is the lowest-priority tier in the resolution hierarchy.

### Voter weight (`waiv_power`)

Each voter's weight uses **`waiv_power`** from [`user_object_powers`](waiv-power.md) (Hive Engine WAIV `stake + delegationsIn` for tracked accounts). This replaces **`object_reputation`** for validity weighting only; `object_reputation` on `accounts_current` may still exist for other features.

```
weight_i = waiv_power_i > 1 ? waiv_power_i : 1
```

### Field weight computation

For each update, compute the field weight as the signed sum of all community validity votes:

```
field_weight = Σ (weight_i × sign_i)
```

Where:

- `sign_i = +1` if `vote_i = 'for'`
- `sign_i = −1` if `vote_i = 'against'`

### Validity from field weight

| Condition | Result |
|-----------|--------|
| `field_weight >= 0` | Update is **VALID** |
| `field_weight < 0` | Update is **INVALID** (not shown in resolved view) |
| No community votes | `field_weight = 0` → **VALID** (baseline default) |

### Resolution hierarchy (complete)

The full validity resolution for a given update, in priority order:

1. **Admin decisive vote** → latest admin `for`/`against` wins (LWAW).
2. **Trusted decisive vote** → latest trusted `for`/`against` wins, only on objects the trusted user has authority over (LWTW).
3. **Community vote weight** → `field_weight` from all non-admin, non-trusted voters using `waiv_power` as above.
4. **No votes at all** → baseline `VALID`.

Tiers 1 and 2 produce a binary `VALID`/`REJECTED` and short-circuit — community weight is not evaluated. Tier 3 is evaluated only when no decisive admin/trusted vote exists.

## D) LWW for single-value fields (same creator)

For update types targeting a single-value field:

- Key scope: `(object_id, field_key, creator)`.
- Newer `update_create` from same creator for same field replaces previous current update in that scope.

Cross-creator “which update wins” for the public resolved field is defined in **§B — Tie-break for single-cardinality field winner**, not by §D alone.

## Determinism

- Same event stream must produce identical stored raw vote state.
- Same governance context/snapshot must produce identical `final_status` and ranking output.
- Same `user_object_powers` values and same raw vote set must produce identical `field_weight` and community-tier validity, and identical persisted `rank_score` for a given `rank_vote` stream.
- Same resolved `validity_tier` / vote metadata on `ResolvedUpdate` rows must produce identical single-cardinality field winners.
