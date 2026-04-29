# Object categories (`object_categories`, `object_categories_related`)

**Back:** [chain-indexer overview](overview.md) · **Related:** [meta-group-sync](meta-group-sync.md), [Data model flow](../../../spec/data-model/flow.md)

## Purpose

Materialize governance-resolved **`category`** update values per object (`object_categories.category_names`) so the query layer does not join `object_updates` / validity for shop navigation.

Aggregated **`object_categories_related`** rows per **`scope_type` / `scope_key`** power `GET /query/v1/users/:name/categories` (`apps/query-api`).

**User scopes** use `scope_key = buildUserScopeKey(account, types)` — precomputed **`SHOP_TYPE_BUCKETS`**: **`book,product`** and **`recipe`** (`@opden-data-layer/core` `category-tree.constants`). Legacy queue rows keyed only by username resolve to the first bucket when parsed.

Sentinel category name **`__uncategorized__`** carries the count of distinct product groups (`COALESCE(meta_group_id, object_id)`) in scope with empty `category_names`.

### Shop membership (aggregation)

For each user bucket SQL builds distinct `objects_core` ids from:

1. **`object_authority`** where `authority_type ∈ ('ownership', 'administrative')`, `oa.account = :account`, and `object_core.object_type` matches the bucket types.
2. **`post_objects`** where `post_objects.author = :account` (same types), unless hidden by **`user_metadata.hide_linked_objects`** (book/product bucket) or **`hide_recipe_objects`** (recipe bucket).

**`user_shop_deselect`**: excludes **post-linked** objects only (`NOT IN` on the **`post_objects` branch`). Objects reached only via authority are unaffected. Rows are removed when the user **`add`**s **any** `object_authority` for that `object_id` (see **`AuthorityHandler`**).

## Triggers

Per-object sync queue (`object_categories_sync_queue`):

- **`update_create`** where `update_type === 'category'` (`UPDATE_TYPES.CATEGORY`).
- **`update_vote`** where the voted row is `category` (including `vote === 'remove'`).

Related scope sync queue (`object_categories_related_sync_queue`):

- **`CategoryMutatedEvent`**: enqueue global (`'global','_'`); enqueue both shop buckets per **ownership/administrative** account on **`object_authority`** for this `object_id`; enqueue both buckets per **distinct post `author`** in **`post_objects`** for this `object_id`; enqueue the object row itself.
- **`AdministrativeAuthorityChangedEvent`**, **`OwnershipAuthorityChangedEvent`**: enqueue both **`user`** shop bucket scopes for that account.
- **`UserMetadataChangedEvent`** (full **`user_metadata`** row replaced via **`update_user_metadata`** ODL action).
- **`UserShopDeselectChangedEvent`** (`user_shop_deselect` ODL action).
- **`PostObjectChangedEvent`** (root post / comment pipeline changed **`post_objects`** for an author).

Emitters:

- [`update-create.handler.ts`](../../../../apps/chain-indexer/src/domain/odl-parser/handlers/update-create.handler.ts)
- [`update-vote.handler.ts`](../../../../apps/chain-indexer/src/domain/odl-parser/handlers/update-vote.handler.ts)
- [`authority.handler.ts`](../../../../apps/chain-indexer/src/domain/odl-parser/handlers/authority.handler.ts)
- [`user-metadata.handler.ts`](../../../../apps/chain-indexer/src/domain/odl-parser/handlers/user-metadata.handler.ts) (`update_user_metadata`)
- [`shop-deselect.handler.ts`](../../../../apps/chain-indexer/src/domain/odl-parser/handlers/shop-deselect.handler.ts) (`user_shop_deselect`)
- [`post-upsert.service.ts`](../../../../apps/chain-indexer/src/domain/hive-comment/post-upsert.service.ts), [`comment-post-object-bind.service.ts`](../../../../apps/chain-indexer/src/domain/hive-comment/comment-post-object-bind.service.ts)

Listener / enqueue: [`category-sync.handler.ts`](../../../../apps/chain-indexer/src/domain/odl-parser/handlers/category-sync.handler.ts).

## Algorithms

### Per-object (`ObjectCategoriesWorker`)

Scheduled interval worker (same pattern as [`HivePostSyncWorker`](../../../../apps/chain-indexer/src/domain/hive-vote/hive-post-sync.worker.ts)).

1. `CLAIM FOR UPDATE SKIP LOCKED` rows from `object_categories_sync_queue`.
2. Load [`AggregatedObject`](../../../../libs/objects-domain/src/types/aggregated-object.ts); resolve **`platform`** governance (`GovernanceCacheService.resolvePlatform()`).
3. **`ObjectViewService.resolve`** with `update_types: [UPDATE_TYPES.CATEGORY]` (same rules as [`MetaGroupSyncHandler`](../../../../apps/chain-indexer/src/domain/odl-parser/handlers/meta-group-sync.handler.ts) but for categories).
4. Keep up to **15** VALID multi-cardinality winners (ordering from resolver / rank votes).
5. Upsert **`object_categories`**: `meta_group_id` from **`objects_core`**, `updated_at_seq` from max selected **`event_seq`** (or max category **`object_updates`** event_seq when empty).
6. **`DELETE`** queue row on success; backoff / delete on max attempts (see worker config).

Constants: [`object-categories.constants.ts`](../../../../apps/chain-indexer/src/constants/object-categories.constants.ts).

### Per-scope (`ObjectCategoriesRelatedWorker`)

1. Claim from `object_categories_related_sync_queue`.
2. Parse **`scope_key`** → `account` + types (`parseUserScopeKey`); load **`user_metadata`** hide flags and **`user_shop_deselect`** object ids.
3. **User** scope: CTEs for authority + (optional) post-linked objects; build `related_names` via co-occurrence on the same `group_key`.
4. **Global** scope: all `objects_core` (no authority filter); store **`group_keys` as empty arrays** (no overlap-dedup payload on the read path for global).
5. Replace all rows for that scope in a transaction (**delete** + **insert**).

## Invariants

- After successful category create/vote events, the object row in **`object_categories`** matches **`ResolvedObjectView`** for **`category`** under platform governance (up to **15** strings).
- **`__uncategorized__.objects_count`** is the number of distinct groups in scope with no category names.
- Global scope materialization is queued whenever any object’s categories change; related rows may lag briefly until the worker runs.

## Operational backfill

[`scripts/backfill-object-categories.ts`](../../../../scripts/backfill-object-categories.ts) enqueues all objects with `update_type = category`, global scope, and both shop buckets for every account with **ownership/administrative** authority or **author** in **`post_objects`**. Run **chain-indexer** until both queues drain.
