# Vote semantics: query-time validity and rank resolution

**Back:** [Spec index](README.md) · **Related:** [governance-resolution](governance-resolution.md), [object-type-entity](object-type-entity.md), [reject-codes](reject-codes.md)

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
  - `for` -> `VALID`
  - `against` -> `REJECTED`
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

### Query-time decisive ranking resolution

Ranking uses the same hierarchy:

1. Latest `admin` wins (LWAW).
2. If no admins vote exists, latest `trusted` wins but only on objects he has authority update (LWTW).

`latest` is determined by `event_seq DESC`.

### Ranking output

- Decisive rank vote yields `rank_score` (`0..10000`) per update/context.
- `rank_score` is used with other ranking signals.
- Validity remains controlled by validity channel.

### Tie-break when `rank_score` is equal

For updates with equal `rank_score` in same `rank_context`:

1. latest decisive rank vote by `event_seq DESC`;
2. latest update event by `event_seq DESC`;
3. `update_id ASC`.

### Tie-break for single-cardinality field winner

For update types with `cardinality: single`, when multiple **VALID** candidates share the same maximal `event_seq`, the winning update is the one with **lexicographically smallest** `update_id` (`update_id ASC`). This keeps the resolved winner deterministic (used e.g. for the `en-US` description that drives site canonical in [site-canonical](site-canonical.md)).

## C) Community vote weight

When no admin or trusted decisive vote exists for an update, the **community vote weight** system determines validity. This is the lowest-priority tier in the resolution hierarchy.

### Voter reputation (`object_reputation`)

Each voter's weight is derived from their `object_reputation` — a metric stored in [`accounts_current`](social-account-ingestion.md) and maintained incrementally by the Indexer.

Definition:

```
object_reputation(voter) = count of unique users who hold
    `administrative` authority claims on objects created by the voter
    (excluding the voter themselves)
```

Source data: `object_authority` records with `authority_type = 'administrative'` joined against `objects_core.creator`. See [authority-entity.md](authority-entity.md) for authority write rules.

### Vote power formula

```
votePower = 1 + log₂(1 + object_reputation)
```

Scaling examples:

| `object_reputation` | `votePower` |
|--------------------:|------------:|
| 0                   | 1.00        |
| 1                   | 2.00        |
| 3                   | 3.00        |
| 7                   | 4.00        |
| 15                  | 5.00        |
| 100                 | ≈ 7.66      |

Every voter starts with a base power of 1. Growth is logarithmic — diminishing returns prevent domination by a single high-reputation account.

### Field weight computation

For each update, compute the field weight as the signed sum of all community validity votes:

```
field_weight = Σ (votePower_i × sign_i)
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
3. **Community vote weight** → `field_weight` computed from all non-admin, non-trusted voter reputations. Sign determines validity.
4. **No votes at all** → baseline `VALID`.

Tiers 1 and 2 produce a binary `VALID`/`REJECTED` and short-circuit — community weight is not evaluated. Tier 3 is evaluated only when no decisive admin/trusted vote exists.

## D) LWW for single-value fields (same creator)

For update types targeting a single-value field:

- Key scope: `(object_id, field_key, creator)`.
- Newer `update_create` from same creator for same field replaces previous current update in that scope.

## Determinism

- Same event stream must produce identical stored raw vote state.
- Same governance context/snapshot must produce identical `final_status` and ranking output.
- Same `object_reputation` values and same raw vote set must produce identical `field_weight` and community-tier validity.
