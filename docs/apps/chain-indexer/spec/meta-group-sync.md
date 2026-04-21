# Meta group sync (`meta_group_id`)

**Back:** [chain-indexer overview](overview.md) · **Related:** [Data model flow](../../../spec/data-model/flow.md), [ODL pipeline](odl-pipeline.md)

## Purpose

`objects_core.meta_group_id` stores the **winning** `group_id` update value for an object so the query layer can group or deduplicate catalog rows without joining `object_updates` on every search.

The indexer keeps this column aligned with the same resolution rules as `ResolvedObjectView` (validity, locale, single cardinality) by running `ObjectViewService` with **platform governance** from config.

## Triggers

- `update_create` when `update_type` is `group_id`
- `update_vote` when the voted row in `object_updates` has `update_type` `group_id` (including `vote === 'remove'`)

Each trigger emits an in-process event handled by `MetaGroupSyncHandler` (`apps/chain-indexer/src/domain/odl-parser/handlers/meta-group-sync.handler.ts`).

## Algorithm

1. Load aggregated object rows (core, updates, votes, authority, voter reputations) for the `object_id`.
2. Resolve `GovernanceSnapshot` via `GovernanceCacheService.resolvePlatform()` (platform governance object from config, or default empty snapshot).
3. Call `ObjectViewService.resolve` with `update_types: ['productGroupId']` and that snapshot.
4. Read the winning value from `fields.group_id.values[0].value_text`, or `null` if none.
5. If it equals `objects_core.meta_group_id`, exit; otherwise `UPDATE objects_core SET meta_group_id = …`.

## Invariant

After any successful `group_id` create or vote affecting validity, `meta_group_id` matches the platform-governance-resolved winning `group_id` for that object (or is `null` when no winning value exists).
