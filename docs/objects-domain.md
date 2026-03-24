# objects-domain: ResolvedView assembly

`@opden-data-layer/objects-domain` is a framework-agnostic domain library that resolves raw database rows into fully structured `ResolvedObjectView` objects. It is reusable across any NestJS application in the monorepo.

## What it does

Given raw DB rows for a batch of objects (core, updates, votes, authorities) and a governance snapshot, the library:

1. Filters banned creators
2. Computes the curator set `C` per object
3. Resolves validity for each update using the tiered hierarchy (curator filter → admin LWAW → trusted LWTW → community vote weight → baseline VALID)
4. Applies **locale preference** on VALID rows per `update_type` (see [Locale filtering](#locale-filtering))
5. Applies single/multi cardinality rules and ranking
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
    const { objects, voterReputations } =
      await this.aggregatedObjectRepository.loadByObjectIds(objectIds);

    return this.objectViewService.resolve(objects, voterReputations, {
      update_types: ['name', 'description', 'location'],
    });
  }
}
```

### 3. `ObjectViewService.resolve` options

```typescript
objectViewService.resolve(objects, voterReputations, {
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

## Output shape

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
  field_weight: number | null;   // community vote weight; null if admin/trusted decided
  rank_score: number | null;     // 1..10000; null for single-cardinality fields
  rank_context: string | null;
}
```

## Data loading: AggregatedObjectRepository

The repository is app-scoped (currently in `chain-indexer`). It runs the 6-query pipeline described in [spec/postgres-concept/flow.md](../spec/postgres-concept/flow.md) §Step 3:

```
1. objects_core       ─┐
2. object_updates      │  parallel Promise.all
3. validity_votes      │
4. rank_votes          │
5. object_authority   ─┘
6. accounts_current   — sequential, uses distinct voter names from queries 3+4
```

All six queries use `object_id IN (...)` so a single call loads a full batch efficiently.

## Governance snapshot

The library ships `DEFAULT_GOVERNANCE_SNAPSHOT` — an empty stub where all sets are empty, `object_control` is `null`, and `inherits_from` is `[]`. Under this default:

- No banned accounts → all objects and updates are included
- No admins or trusted → community vote weight tier applies
- No curator set → normal vote semantics for every object

Replace the default with a real `GovernanceSnapshot` when governance resolution is implemented:

```typescript
objectViewService.resolve(objects, voterReputations, {
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
  resolveUpdateValidity,
} from '@opden-data-layer/objects-domain';
```

This is useful in scripts, workers, or unit tests that do not run a full NestJS application.

## Related specs

- [spec/postgres-concept/flow.md](../spec/postgres-concept/flow.md) — read flow, 6-query pipeline, ResolvedView assembly steps
- [spec/vote-semantics.md](../spec/vote-semantics.md) — validity tiers, community vote weight, ranking
- [spec/authority-entity.md](../spec/authority-entity.md) — curator filter, ownership vs administrative authority
- [spec/governance-resolution.md](../spec/governance-resolution.md) — GovernanceSnapshot construction
