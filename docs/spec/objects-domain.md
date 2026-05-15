# objects-domain: ResolvedView assembly

`@opden-data-layer/objects-domain` is a framework-agnostic domain library that resolves raw database rows into fully structured `ResolvedObjectView` objects. It is reusable across any NestJS application in the monorepo.

## What it does

Given raw DB rows for a batch of objects (core, updates, votes, authorities) and a governance snapshot, the library:

1. Filters banned creators
2. Computes the curator set `C` per object
3. Resolves validity for each update using the tiered hierarchy (curator filter → admin LWAW → trusted LWTW → **waiv_power** community weight → baseline VALID). Community rows are shown only when `approve_percent > MIN_PERCENT_TO_SHOW_UPDATE` (70), except after a decisive admin/trusted vote. See [waiv-power.md](waiv-power.md) and [Approval percentage](#approval-percentage) below.
4. Applies **locale preference** on VALID rows per `update_type` (see [Locale filtering](#locale-filtering))
5. Applies single/multi cardinality rules; **multi** ordering uses persisted `rank_score` / `rank_decisive_event_seq` on `object_updates`
6. Returns a typed `ResolvedObjectView[]` ready for API serialization

## Integration in an application

### 1. Register the module

Import `ObjectsDomainModule` into your feature module:

```typescript
import { Module } from '@nestjs/common';
import { ObjectsDomainModule } from '@opden-data-layer/objects-domain';
import { RepositoriesModule } from './repositories/repositories.module';

@Module({
  imports: [RepositoriesModule, ObjectsDomainModule],
  providers: [MyQueryService],
})
export class MyModule {}
```

### 2. Inject the service and repository

```typescript
import { Injectable } from '@nestjs/common';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import { AggregatedObjectRepository } from './repositories/aggregated-object.repository';

@Injectable()
export class MyQueryService {
  constructor(
    private readonly aggregatedObjectRepository: AggregatedObjectRepository,
    private readonly objectViewService: ObjectViewService,
  ) {}

  async getResolvedObjects(objectIds: string[]): Promise<ResolvedObjectView[]> {
    const { objects, voterWaivPowers } =
      await this.aggregatedObjectRepository.loadByObjectIds(objectIds);

    return this.objectViewService.resolve(objects, voterWaivPowers, {
      update_types: ['name', 'description', 'location'],
    });
  }
}
```

### 3. `ObjectViewService.resolve` options

```typescript
objectViewService.resolve(objects, voterWaivPowers, {
  update_types: ['name', 'price'],  // required — which update types to include
  locale: 'en-US',                  // optional, default 'en-US'
  include_rejected: false,          // optional, default false
  governance: myGovernanceSnapshot, // optional, default = empty snapshot (all-permissive)
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `update_types` | `string[]` | required | Only these update types are resolved and returned |
| `locale` | `string` | `'en-US'` | BCP-47 locale used when choosing among VALID updates (see [Locale filtering](#locale-filtering)) |
| `governance` | `GovernanceSnapshot` | empty stub | Governance context: admins, trusted, banned, object_control, etc. |
| `include_rejected` | `boolean` | `false` | When true, REJECTED updates are appended after VALID ones in each field |

## Locale filtering

Resolution uses the optional `locale` column on each `object_updates` row (set at index time via `update_create` payload). It does **not** filter raw rows before validity; votes and curator rules run on the full set first.

For each `(object_id, update_type)` group, after validity is known:

- **Single-cardinality:** Among VALID updates, if any row has `locale === options.locale`, only those rows are considered for the LWW / `event_seq` winner. If none match, all VALID rows are considered (legacy behavior).
- **Multi-cardinality:** Among VALID updates, the preferred set is rows with `locale === options.locale` **plus** language-neutral rows (`locale` null). Cardinality and ranking run on that set. If the preferred set is empty, fall back to all VALID rows.

If the request locale has no usable VALID updates (e.g. only REJECTED rows in that language), the resolver falls back to other locales so the API still returns a value when one exists.

Each `ResolvedUpdate` echoes `locale` from the winning row for clients.

Pure helper: `filterByLocalePreference` is exported from `@opden-data-layer/objects-domain` for tests and advanced use.

## Approval percentage

`MIN_PERCENT_TO_SHOW_UPDATE` is **70** (`@opden-data-layer/objects-domain`). A community-evaluated update is **VALID** (eligible to win) only when `approve_percent` is **strictly greater than** 70 — not equal.

**`computeApprovePercent(update, validityVotes, governance, voterWaivPowers, objectAuthorities)`** returns the display/consensus percentage (0–100, up to three decimal places) for one update. It mirrors the empty-curator vote hierarchy for the *numeric* outcome:

| Condition | `approve_percent` |
|---|---|
| Latest admin vote **for** / **against** | 100 / 0 |
| Latest trusted vote **for** / **against** (voter has object authority) | 100 / 0 |
| No privileged vote, **no community votes** | **100** (open baseline) |
| Community: net weight ≤ 0 | 0 |
| Community: only **for** votes (no **against**) | 100 |
| Community: mixed **for** and **against** | `round(for_weight / (for_weight + against_weight) × 100, 3)` with WAIV weights |

`ResolvedUpdate.approve_percent` is the same value returned by `computeApprovePercent` for that row. On the **curator-filter** path, validity still follows curator membership / curator **for** votes; `approve_percent` is still filled for API/UI (e.g. update lists) but does not gate validity for that path.

Import reusable pieces:

```typescript
import {
  computeApprovePercent,
  MIN_PERCENT_TO_SHOW_UPDATE,
  resolveObjectViews,
} from '@opden-data-layer/objects-domain';
```

```typescript
interface ResolvedObjectView {
  object_id: string;
  object_type: string;
  creator: string;
  weight: number | null;
  meta_group_id: string | null;
  fields: Record<string, ResolvedField>;
}

interface ResolvedField {
  update_type: string;
  cardinality: 'single' | 'multi';
  values: ResolvedUpdate[];   // single: at most 1; multi: ordered by rank
}

interface ResolvedUpdate {
  update_id: string;
  update_type: string;
  creator: string;
  locale: string | null;
  event_seq: bigint;
  value_text: string | null;
  value_json: JsonValue | null;
  validity_status: 'VALID' | 'REJECTED';
  approve_percent: number;    // 0–100; see Approval percentage
  field_weight: number | null;   // signed community Σ(weight × sign); null if admin/trusted decided
  rank_score: number | null;     // 0..10000 from object_updates; indexer-maintained for multi
  rank_context: string | null;
  rank_decisive_event_seq: bigint | null;
}
```

## Data loading: AggregatedObjectRepository

The repository is app-scoped (`chain-indexer` and `query-api`). It runs the **five-query** pipeline described in [data-model/flow.md](data-model/flow.md) §Step 3:

```
1. objects_core       ─┐
2. object_updates      │  parallel Promise.all (includes rank fields)
3. validity_votes      │
4. object_authority   ─┘
5. user_object_powers — uses distinct validity voter names from step 3
```

Raw `rank_votes` are **not** loaded for resolution; rank is read from `object_updates`.

## Governance snapshot

The library ships `DEFAULT_GOVERNANCE_SNAPSHOT` — an empty stub where all sets are empty, `object_control` is `null`, and `inherits_from` is `[]`. Under this default:

- No banned accounts → all objects and updates are included
- No admins or trusted → community vote weight tier applies
- No curator set → normal vote semantics for every object

Replace the default with a real `GovernanceSnapshot` when governance resolution is implemented:

```typescript
objectViewService.resolve(objects, voterWaivPowers, {
  update_types: ['name'],
  governance: await governanceService.resolveSnapshot(governanceObjectId),
});
```

## Pure resolver functions (advanced use)

The NestJS service is a thin wrapper. The underlying pure functions can be used directly without the DI container:

```typescript
import {
  resolveObjectViews,
  computeCuratorSet,
  computeApprovePercent,
  resolveUpdateValidity,
} from '@opden-data-layer/objects-domain';
```

This is useful in scripts, workers, or unit tests that do not run a full NestJS application.

## Related specs

- [data-model/flow.md](data-model/flow.md) — read flow, five-query pipeline, ResolvedView assembly steps
- [vote-semantics.md](vote-semantics.md) — validity tiers, community vote weight, ranking
- [waiv-power.md](waiv-power.md) — WAIV stake weighting and `user_object_powers`
- [authority-entity.md](authority-entity.md) — curator filter, ownership vs administrative authority
- [governance-resolution.md](governance-resolution.md) — GovernanceSnapshot construction
