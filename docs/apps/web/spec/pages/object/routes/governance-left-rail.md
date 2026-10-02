---
id: web-pages-object-routes-governance-left-rail
title: Object page — governance left rail
description: "Governance object left-rail account lists and control fields in view mode."
type: spec
status: active
scope: web
tags: [web, page, object, governance]
updated_at: 2026-08-27
related:
  - docs/apps/web/spec/pages/object/page-shell.md
  - docs/apps/web/spec/pages/object/routes/edit-mode.md
  - docs/spec/governance-resolution.md
---

# Object page — governance left rail

**Back:** [page-shell](../page-shell.md) · **Related:** [edit-mode](edit-mode.md), [governance-resolution.md](../../../../../spec/governance-resolution.md)

## Purpose

On `object_type = governance`, the left rail shows governance update fields in **view mode**: administrators, moderators, trusted accounts, authorities, authors, whitelist, restricted, banned, object control, inherits-from, and validity cutoff.

Values come from `POST /query/v1/objects/resolve` → `fields.*` (this object's VALID updates). They are **not** the merged governance snapshot used internally for vote validity.

## Display rules

| Block kind | Source field | View rendering |
|------------|--------------|----------------|
| `objectControl` | `fields.objectControl` | Scalar text (e.g. `full`) |
| `admins`, `moderators`, `trusted`, `authorities`, `authors`, `whitelist`, `restricted`, `banned` | `fields.<kind>` string array | Avatar + `@account` profile link |
| `inheritsFrom` | `fields.inheritsFrom` | Object link + scope list |
| `validityCutoff` | `fields.validityCutoff` | `@account` + ISO date from unix timestamp |

Account lists show **10 rows** initially, then **Show more** / **Show less** (`show_more`, `object_updates_show_less`).

Empty lists are omitted in view mode. Edit mode shows heading + `+` for all supported governance slots (GOVERNANCE group).

## Block order

Matches core edit-field-groups catalog: `objectControl` → account lists → `inheritsFrom` → `validityCutoff`. Appended to `ABOUT_SECTION_BLOCK_ORDER` in [`object-left-rail-order.ts`](../../../../../apps/web/src/modules/object/domain/object-left-rail-order.ts).

## Key files

| Area | Path |
|------|------|
| Block builder | `apps/web/src/modules/object/infrastructure/projected-object-to-page-model.ts` |
| Projections | `apps/web/src/modules/object/infrastructure/object-projected-fields.ts` |
| Account list UI | `apps/web/src/modules/object/presentation/components/object-user-ref-list-left-rail-section.tsx` |
| Panel | `apps/web/src/modules/object/presentation/components/object-left-rail-panel.tsx` |
| query-api projection | `apps/query-api/src/domain/object-projection/project-field.ts` |

## Verification

```bash
pnpm nx test web --testPathPatterns="object-user-ref|projected-object-to-page-model|object-left-rail-order"
pnpm nx test query-api --testPathPatterns="project-field|project-object"
```

Manual: open `/object/<governance-id>` — left rail lists admins/mods/etc.; lists with >10 accounts collapse; profile links work.
