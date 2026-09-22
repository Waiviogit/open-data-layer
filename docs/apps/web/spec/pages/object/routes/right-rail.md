---
id: web-pages-object-routes-right-rail
title: Object page — right rail
description: "Right column on the object detail page (`lg+`), also stacked on mobile Details landing:"
tags: [web, page, object, layout]
related:
  - docs/apps/web/spec/pages/object/page-shell.md
  - docs/apps/web/spec/pages/object/routes/ref-feeds.md
  - docs/apps/web/spec/pages/object/routes/field-references-feed.md
type: spec
status: active
scope: web
updated_at: 2026-06-10
---

# Object page — right rail

**Back:** [web overview](../../overview.md) · **Related:** [navigation.md](../navigation.md), [object-card.md](../../../object-card.md), [followers.md](followers.md), [ref-feeds.md](ref-feeds.md), [field-references-feed.md](field-references-feed.md)

## Scope

Right column on the object detail page (`lg+`). The same view-mode blocks also stack on the **mobile Details landing** (below `lg`, `standardView` only — see [page-shell.md](../page-shell.md) § Mobile stacking):

- **View mode** (default): Related, Similar, Add-On, Field references (person/business sources), Experts, and Followers preview blocks. Full lists live in the **center column** on dedicated primary-tab routes.
- **Edit mode** (logged-in viewer, hero Edit toggle): **Preview** and **Object completeness** only — same panels as [object create](../../object-create/page.md) (`ObjectPreviewPanel`, `ObjectHealthPanel`). Related / Similar / Add-On / Field references / Followers are not shown. Edit rail stays desktop-only.

Hidden in **Instagram** shell mode at `lg+` (`shell-hide-instagram`), same as profile right rail. Below `lg`, shell-mode chrome does not apply, so the lists show on mobile Details.

## Layout

- Shell: [`ObjectViewShell`](../../../../apps/web/src/modules/object/presentation/components/object-view-shell.tsx) — third grid column, class `shell-object-page-grid`.
- Width: **18rem** default, **22rem** in Twitter shell mode ([`theme.css`](../../../../apps/web/src/styles/theme.css)); wider than profile `--shell-right-width` for longer mini-card titles.
- Component: [`ObjectRightSidebar`](../../../../apps/web/src/modules/object/presentation/components/object-right-sidebar.tsx).

## Edit mode

- Gating: `isEditMode && viewerUsername` in [`object-page-client.tsx`](../../../../apps/web/src/app/(app)/object/[object-id]/object-page-client.tsx) (same as left-rail `editContext`).
- Component: [`ObjectEditRightRail`](../../../../apps/web/src/modules/object/presentation/components/object-edit-right-rail.tsx).
- Data: [`objectPageModelToPreviewFields`](../../../../apps/web/src/modules/object/application/mappers/object-page-to-preview-fields.ts) maps `ObjectPageViewModel` → create-workspace `FieldEntry[]`; completeness via `computeSemanticCompleteness` from `@/modules/object-create/domain/semantic-completeness`.
- Panels refresh after on-chain updates when the page revalidates (no live draft while `AddUpdateModal` is open).
- SSR still loads view-mode ref/follower rail data on every request; edit mode simply does not render that slot.

## Sections (view mode, top → bottom)

| Section | Visibility | Data source | Preview size | Show more |
| ------- | ------------ | ----------- | ------------ | --------- |
| **Related** | Object type supports `isRelatedTo` in registry **and** section has ≥1 item after fetch | `GET /query/v1/objects/:id/related` | 5 mini cards | `/object/:id/related` |
| **Similar** | `isSimilarTo` supported **and** ≥1 item | `GET .../similar` | 5 | `/object/:id/similar` |
| **Add-On** | `addOn` supported **and** ≥1 item | `GET .../add-on` | 5 | `/object/:id/add-on` |
| **Followers** | `followers_count > 0` on resolve **and** API returns ≥1 row | `GET .../followers` (`sort=rank`) | 5 accounts | `/object/:id/followers` |
| **Field references** | Source type is `person` or `business` **and** summary returns ≥1 item in a group | `GET .../field-references` | 5 per group | `/object/:id/books` or `/object/:id/products` |

Empty sections are **not rendered** (no placeholder card).

### Fetch limits (SSR)

| Block | Limit requested | Constant |
| ----- | ----------------- | -------- |
| Related / Similar / Add-On | `6` (5 shown + detect `hasMore`) | `RIGHT_RAIL_REF_FETCH_LIMIT` in [`object-ref-list.client.ts`](../../../../apps/web/src/modules/object/infrastructure/object-ref-list.client.ts) |
| Field references | `6` (5 shown + detect `hasMore`) | `FIELD_REFERENCES_RAIL_FETCH_LIMIT` in [`object-field-references.client.ts`](../../../../apps/web/src/modules/object/infrastructure/object-field-references.client.ts) |
| Followers | `6` | `RIGHT_RAIL_FOLLOWERS_FETCH_LIMIT` in [`object-social.client.ts`](../../../../apps/web/src/modules/object/infrastructure/clients/object-social.client.ts) |

All right-rail data is loaded in [`object-page-right-rail-section.server.tsx`](../../../../apps/web/src/app/(app)/object/[object-id]/object-page-right-rail-section.server.tsx) on every object page view (not gated on active tab). Center-column feeds for the same tabs use separate SSR payloads when that tab is active.

## UI patterns

### Object ref mini cards (Related / Similar / Add-On)

- Component: [`ObjectRefCard`](../../../../apps/web/src/modules/object/presentation/components/object-ref-list-feed.tsx) inside [`ObjectRefSection`](../../../../apps/web/src/modules/object/presentation/components/object-right-sidebar.tsx).
- Layout: 48×48 thumbnail + truncated title, link to `/object/:refId`.
- Styling: `rounded-card border border-border bg-surface/60`, shared with ref sections.

### Followers mini list

- Component: [`ObjectRightFollowersSection`](../../../../apps/web/src/modules/object/presentation/components/object-right-followers-section.tsx).
- Row: 40px avatar + truncated username + `wobjectsWeight` badge (2 decimals) → `/@username`.
- No sort control and no follow button (full UX on Followers tab).

### Show more

- Label: i18n `object_right_show_more`.
- Shown when API `hasMore` is true (ref lists) or `hasMore || total > 5` (followers preview). Field references: when the section has ≥1 item (legacy — opens full center feed).

Path helpers: [`object-page-url.constants.ts`](../../../../apps/web/src/modules/object/domain/object-page-url.constants.ts) — `buildObjectRelatedPath`, `buildObjectSimilarPath`, `buildObjectAddOnPath`, `buildObjectFieldReferencesPath`, `buildObjectFollowersPath`.

## Center column (full feeds)

When the user opens a ref tab or followers tab, the center column shows the full experience:

| Tab URL | Center UI | API page size |
| ------- | --------- | ------------- |
| `/object/:id/related` | [`ObjectRefListFeed`](../../../../apps/web/src/modules/object/presentation/components/object-ref-list-feed.tsx) + [`ObjectCard`](../../../object-card.md) | 20 (`REF_LIST_PAGE_SIZE`) |
| `/object/:id/similar` | same | 20 |
| `/object/:id/add-on` | same | 20 |
| `/object/:id/books` | [`ObjectFieldReferencesListFeed`](../../../../apps/web/src/modules/object/presentation/components/object-field-references-list-feed.tsx) + [`ObjectCard`](../../../object-card.md) | 20 (`REF_LIST_PAGE_SIZE`) |
| `/object/:id/products` | same | 20 |
| `/object/:id/followers` | [`UserSocialAccountList`](../../../../apps/web/src/modules/user-social/presentation/components/user-social-account-list.tsx) | 20 (`USER_SOCIAL_PAGE_SIZE`) |

Ref center feeds support load-more via server action [`load-more-ref-list.actions.ts`](../../../../apps/web/src/app/(app)/object/[object-id]/related/load-more-ref-list.actions.ts). Field references load-more: [`load-more-field-references.actions.ts`](../../../../apps/web/src/app/(app)/object/[object-id]/field-references/load-more-field-references.actions.ts).

Proxy: [`proxy.ts`](../../../../apps/web/src/proxy.ts) rewrites `/object/:id/<tab>` → `?tab=<tab>` for segments in `OBJECT_PAGE_PATH_TAB_SEGMENTS` (includes `related`, `similar`, `add-on`, `followers`). Field references use legacy paths `/object/:id/books` and `/object/:id/products` → `?tab=field-references&field_reference_type=…` (see [field-references-feed.md](field-references-feed.md)).

## Props wiring

```
page.tsx (SSR)
  → ObjectPageClient
      → ObjectViewShell.rightRail
            view: ObjectRightSidebar (SSR slot from ObjectPageRightRailSection)
            edit: ObjectEditRightRail (client; preview + completeness)
```

Field-reference groups use `fieldReferenceSectionTitle` in [`object-right-sidebar.tsx`](../../../../apps/web/src/modules/object/presentation/components/object-right-sidebar.tsx) (book icon for `book` type).

Registry gate for ref sections: `objectTypeSupportsRefList` in `object-page-right-rail-section.server.tsx` checks `OBJECT_TYPE_REGISTRY[objectTypeKey].supported_updates`. Field references gate: `isFieldReferenceSourceType` in [`field-reference-rules.ts`](../../../../apps/web/src/modules/object/domain/field-reference-rules.ts).

## i18n

| Key | Use |
| ----- | --- |
| `object_right_related` | Related heading |
| `object_right_similar` | Similar heading |
| `object_right_add_on` | Add-On heading |
| `books` | Field references — Books heading |
| `products` | Field references — Products heading |
| `references` | Field references — fallback heading |
| `followers` | Followers heading |
| `object_right_show_more` | Show more link (all sections) |

## Verification

- Object with shop categories + ref/backfill data: Related and Similar sections differ when multiple categories exist (see query-api backfill rules).
- Object with `followers_count > 0`: Followers block at bottom of right rail.
- Show more navigates to clean path URLs above.
