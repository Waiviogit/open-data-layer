---
id: web-pages-object-routes-edit-mode
title: Object page — edit mode
description: Logged-in users can toggle **Edit** on an object profile page and add new ODL updates from the left rail via a `+` control on each block (except Rating). Submissions broadcast a Hive `custom_json` `update_create` event, then follow the standard trx confirmation pattern.
tags: [web, page, object, edit]
related:
  - docs/apps/web/spec/pages/object/page-shell.md
type: spec
status: active
scope: web
updated_at: 2026-06-10
---

# Object edit mode (left rail updates)

**Back:** [web overview](../../overview.md) · **Related:** [updates.md](routes/updates.md), [auth.md](../../auth.md)

## Purpose

Logged-in users can toggle **Edit** on an object profile page and add new ODL updates from the left rail via a `+` control on each block (except Rating). Submissions broadcast a Hive `custom_json` `update_create` event, then follow the standard trx confirmation pattern.

## UX

| State | Behavior |
|-------|----------|
| View mode | Left rail read-only (existing blocks) |
| Edit mode | `+` next to each block heading (menu, description, phones, …) |
| Mobile view (standard object, Details landing) | Left-rail Details only in the mobile stack — see [page-shell.md](../page-shell.md) § Mobile stacking |
| Mobile edit (standard object, Details landing) | Left-rail Details only; center and social previews hidden below `lg` |
| Mobile edit (special host: list / page / widget) | Center host content first (list catalog with edit tools when on List tab), then left-rail Details below `lg` |
| `+` click | Modal: optional update-type select (multi-type blocks), schema-driven value form, optional locale when `UPDATE_REGISTRY[type].localizable` |
| Edit left rail | All supported slots show heading + `+` even when empty; **grouped sections** with sticky headings (HEADER, DETAILS, …); order from core edit-field-groups catalog — see below |
| Update count | Muted line under each field heading (e.g. `2 updates`); **click** navigates to the **Updates** tab and sets the feed `update_type` filter for that field |
| Submit | `buildOdlUpdateCreateOp` → `broadcastOdlOpWithOverflow` (auto IPFS `batch_import` when op JSON exceeds 8192 bytes) → `awaitTrxConfirmation` (+ `awaitBatchImportByTrx` when IPFS used) → `router.refresh()` |
| Creator vote | Indexer auto-inserts validity vote `for` from `creator` on every successful `update_create` (no client `update_vote` in create trx) |
| `object_ref` value | Debounced object search (same as menu item); submitted as `value_text` = referenced `object_id` |
| `geo` value | Latitude/longitude inputs + interactive map (click to set marker; inputs move marker) |
| `walletAddress` value | Cryptocurrency `<select>` (`WALLET_SYMBOLS` from core) + address + optional title |
| **Tags** block (edit) | Inline pills per `tagCategory`; header `+` adds a new `tagCategory` (inline compose, no modal); dashed **New tag** pill per category broadcasts `tagCategoryItem`; click pill → `update_vote` **for** (orange border when viewer voted for); **×** → `update_vote` **against**; category removal only via Updates tab |
| Tags data (MVP) | Only consensus-valid projected tags (`include_rejected=false`); per-viewer hide after reject deferred |

Edit mode and `+` buttons require a logged-in viewer (`viewerUsername` from server). The **Tags** block uses its own header `+` for categories instead of the generic add-update modal.

## Block → update type mapping

`apps/web/src/modules/object-updates/domain/block-update-type-map.ts` maps left-rail `kind` to `UPDATE_TYPES` values (camelCase). Candidates are filtered by `OBJECT_TYPE_REGISTRY[objectType].supported_updates` (via `embeddedUpdatesFeed.typeOptions` on the client).

### Left-rail slot order

**View mode** left-rail block order is unchanged (legacy Waivio layout in `object-left-rail-order.ts` + `buildLeftRailBlocks`).

**Edit mode** order and section groupings come from `@opden-data-layer/core/update-registry` **`edit-field-groups.ts`**:

- Every `update_type` maps to one edit group (`header`, `details`, `community`, `gallery`, `visit`, `commerce`, …).
- Web maps update types → left-rail block kinds (`edit-mode-block-order.ts`); empty groups are omitted at render time.
- **Governance** (`object_type = governance`): `admins`, `moderators`, `trusted`, `authorities`, `whitelist`, `restricted`, `banned`, `objectControl`, `inheritsFrom`, `validityCutoff` map to dedicated block kinds — see [governance-left-rail.md](governance-left-rail.md).
- **Restaurant / place / business:** `price` is grouped under **VISIT** (before hours/address/map), not commerce.

Example restaurant edit groups (supported slots only):

| Group | Fields |
|-------|--------|
| HEADER | Name, Title, Avatar, Background |
| DETAILS | Parent, Menu, Buttons, Description |
| COMMUNITY | Ratings, Tags |
| GALLERY | Gallery |
| VISIT | Price, Hours, Address, Map |
| CONTACT | Website, Social links, Phone, Email |
| PAYMENTS | Wallet |
| OBJECT | Identifier, Status |

Other types use the same taxonomy; type-specific blocks appear only when supported (e.g. **product** → commerce cluster after gallery; **list** → catalog ops after gallery; **recipe** → recipe group after commerce). View-mode stacks (`RECIPE_ABOUT_SECTION_BLOCK_ORDER`, product navigate cluster, etc.) are **not** used for edit ordering.

i18n: `object_edit_group_*` keys in locale catalogs.

### List host edit extras

| Surface | Behavior |
|---------|----------|
| Center catalog (List tab) | Edit mode: object search to add `listItem`; `(reject)` votes against parent `listItem` update when `update_id` is projected |
| `sortCustom` left-rail `+` | **Mode** Auto or Custom. Auto: Sort by Newest/Oldest/A..Z/Z..A (no Rank) + visibility checkboxes. Custom: drag-reorder rows + checkboxes. Payload: Auto → empty `include`, `exclude` unchecked ids, `sortType` auto value; Custom → ordered `include`, `exclude` unchecked, `sortType: custom`. |
| `promotion`, `pin`, `remove`, `delegation` | Standard `+` → `AddUpdateModal` (delegation uses `UserRefSearchField`) |

## Broadcast contract

Built by `@opden-data-layer/hive-broadcast` **`buildOdlUpdateCreateOp`** (single `update_create` event):

```json
{
  "events": [{
    "action": "update_create",
    "v": 1,
    "payload": {
      "object_id": "<id>",
      "update_type": "<camelCase type>",
      "creator": "<hive account>",
      "value_text | value_json | value_geo": "<validated value>",
      "locale": "<optional when localizable>"
    }
  }]
}
```

`chain-indexer` **`UpdateCreateHandler`** persists the update, then best-effort inserts a validity vote `for` from `creator` (idempotent on `(update_id, voter)`). Clients no longer bundle `update_vote` in the same broadcast for self-likes.

`chain-indexer` stores Hive `transaction_id` on rows from the block context (not from payload). On-chain `update_vote` events (other voters, tag reject/approve, etc.) still use explicit `update_id` or `create_event_id` resolution (`update-vote.handler.ts`).

- Hive `custom_json.id`: `useOdlCustomJsonId()` from runtime `ODL_NETWORK` (see [auth.md](../../auth.md)).
- Value field: `value_${value_kind}`, except `object_ref` → `value_text`.
- Client validation reuses `UPDATE_REGISTRY[update_type].schema` from `@opden-data-layer/core`.

## Key files

| Area | Path |
|------|------|
| ODL op builder | `libs/hive-broadcast/src/odl-operations.ts` |
| Block mapping | `apps/web/src/modules/object-updates/domain/block-update-type-map.ts` |
| Edit groups (core) | `libs/core/src/update-registry/edit-field-groups.ts` |
| Edit block order (web) | `apps/web/src/modules/object-updates/domain/edit-mode-block-order.ts` |
| Form utils | `apps/web/src/modules/object-updates/application/update-value-form.utils.ts` |
| Modal | `apps/web/src/modules/object-updates/presentation/components/add-update-modal.tsx` |
| Oversize update broadcast | `apps/web/src/modules/object-updates/application/broadcast-odl-op-with-overflow.ts` |
| Left rail | `apps/web/src/modules/object/presentation/components/object-left-rail-panel.tsx` |
| Tags left rail (edit) | `apps/web/src/modules/object/presentation/components/object-tags-left-rail-section.tsx` |
| Tag chip | `apps/web/src/modules/object-updates/presentation/components/tag-chip.tsx` |
| Tag vote stats | `apps/web/src/modules/object/infrastructure/tag-approval-stats.server.ts` |
| Update count badge | `apps/web/src/modules/object/presentation/components/left-rail-update-count-badge.tsx` |
| Block → filter | `resolveUpdateTypeFilterForBlockKind` in `block-update-type-map.ts` |
| Page wiring | `apps/web/src/app/(app)/object/[object-id]/object-page-client.tsx` |

## Verification

```bash
pnpm nx test hive-broadcast
pnpm nx test web
```
