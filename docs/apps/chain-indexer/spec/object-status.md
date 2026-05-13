# Object status (`objects_core.status`)

## Purpose

Track **visibility / lifecycle** state on `objects_core` without deleting rows. Default is **`active`**.

## Allowed values

`active`, `relisted`, `unavailable`, `nsfw`, `flagged` — enforced in DB (`CHECK`), in the `status` update registry schema (`UPDATE_STATUS`), and in TypeScript (`ObjectStatus` / `OBJECT_STATUS_VALUES` in `@opden-data-layer/core`).

## Who can change it

Only accounts listed as **platform governance admins** (`GovernanceCacheService.resolvePlatform()` → `snapshot.admins`) may apply a new status. Others’ `update_create` rows for `update_type: status` are still written to **`object_updates`**, but **`objects_core.status` is not updated** (logged warning).

## Chain flow

1. ODL **`update_create`** with `update_type: 'status'` and `value_json: { title: '<status>', link: '...' }` (after existing guards and validation).
2. **`UpdateCreateHandler`** persists the update, then emits **`OBJECT_STATUS_CREATED_EVENT`** (`ObjectStatusCreatedEvent` carries `objectId`, **signer** `creator`, and `status` from `title`).
3. **`ObjectStatusHandler`** listens, reloads the platform governance snapshot, and if the signer is in `admins`, runs `UPDATE objects_core SET status = …`.

## Query API

Repositories that read `objects_core` for API-facing data **restrict to `status = 'active'`** (aggregated load, core lookups, follows, category scopes). Non-active objects behave as absent for those endpoints.

## Related

- [ODL pipeline](odl-pipeline.md) — governance cache note in §7.
- [Data model flow](../../../spec/data-model/flow.md) — `objects_core` row shape.

## Verification

- `pnpm nx test chain-indexer` — `object-status.handler.spec.ts`, `update-create.handler.spec.ts` (status emit).
