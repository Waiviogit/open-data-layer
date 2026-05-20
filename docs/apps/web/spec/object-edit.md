# Object edit mode (left rail updates)

**Back:** [web overview](overview.md) · **Related:** [object-updates-feed.md](object-updates-feed.md), [auth.md](auth.md)

## Purpose

Logged-in users can toggle **Edit** on an object profile page and add new ODL updates from the left rail via a `+` control on each block (except Rating). Submissions broadcast a Hive `custom_json` `update_create` event, then follow the standard trx confirmation pattern.

## UX

| State | Behavior |
|-------|----------|
| View mode | Left rail read-only (existing blocks) |
| Edit mode | `+` next to each block heading (menu, description, phones, …) |
| `+` click | Modal: optional update-type select (multi-type blocks), schema-driven value form, optional locale when `UPDATE_REGISTRY[type].localizable` |
| Edit left rail | All supported slots show heading + `+` even when empty; order: **Name**, **Title**, Menu, Parent, Description, … (see `EDIT_MODE_LEFT_RAIL_BLOCK_ORDER`) |
| Submit | Like checkbox (default on): `buildOdlUpdateCreateWithLikeOp` (create + vote in one trx) or off: `buildOdlUpdateCreateOp` only → wallet broadcast → `awaitTrxConfirmation` → `router.refresh()` |
| Like | Footer checkbox labeled **Like**; when checked, envelope has `update_create` (event 0) + `update_vote` with `vote: 'for'` and `create_odl_event_index: 0` |
| `object_ref` value | Debounced object search (same as menu item); submitted as `value_text` = referenced `object_id` |
| `geo` value | Latitude/longitude inputs + interactive map (click to set marker; inputs move marker) |
| `walletAddress` value | Cryptocurrency `<select>` (`WALLET_SYMBOLS` from core) + address + optional title |

Edit mode and `+` buttons require a logged-in viewer (`viewerUsername` from server).

## Block → update type mapping

`apps/web/src/modules/object-updates/domain/block-update-type-map.ts` maps left-rail `kind` to `UPDATE_TYPES` values (camelCase). Candidates are filtered by `OBJECT_TYPE_REGISTRY[objectType].supported_updates` (via `embeddedUpdatesFeed.typeOptions` on the client).

## Broadcast contract

Built by `@opden-data-layer/hive-broadcast` **`buildOdlUpdateCreateOp`** or **`buildOdlUpdateCreateWithLikeOp`** (two events in one `custom_json`):

```json
{
  "events": [{
    "action": "update_create",
    "v": 1,
    "payload": {
      "object_id": "<id>",
      "update_type": "<camelCase type>",
      "creator": "<hive account>",
      "transaction_id": "<uuid>",
      "value_text | value_json | value_geo": "<validated value>",
      "locale": "<optional when localizable>"
    }
  }]
}
```

With Like enabled, a second event is appended:

```json
{
  "action": "update_vote",
  "v": 1,
  "payload": {
    "create_odl_event_index": 0,
    "object_id": "<id>",
    "voter": "<hive account>",
    "vote": "for",
    "transaction_id": "<uuid>"
  }
}
```

`chain-indexer` resolves `update_id` from the same trx when `create_odl_event_index` is set (`update-vote.handler.ts`).

- Hive `custom_json.id`: `ODL_CUSTOM_JSON_ID` from `NEXT_PUBLIC_ODL_NETWORK` (see [auth.md](auth.md)).
- Value field: `value_${value_kind}`, except `object_ref` → `value_text`.
- Client validation reuses `UPDATE_REGISTRY[update_type].schema` from `@opden-data-layer/core`.

## Key files

| Area | Path |
|------|------|
| ODL op builder | `libs/hive-broadcast/src/odl-operations.ts` |
| Block mapping | `apps/web/src/modules/object-updates/domain/block-update-type-map.ts` |
| Form utils | `apps/web/src/modules/object-updates/application/update-value-form.utils.ts` |
| Modal | `apps/web/src/modules/object-updates/presentation/components/add-update-modal.tsx` |
| Left rail | `apps/web/src/modules/object/presentation/components/object-left-rail-panel.tsx` |
| Page wiring | `apps/web/src/app/(app)/object/[object-id]/object-page-client.tsx` |

## Verification

```bash
pnpm nx test hive-broadcast
pnpm nx test web
```
