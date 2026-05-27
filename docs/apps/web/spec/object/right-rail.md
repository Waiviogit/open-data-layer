# Object page — right rail

**Back:** [web overview](../overview.md) · **Related:** [navigation.md](navigation.md), [object-card.md](../object-card.md), [object-followers-feed.md](../object-followers-feed.md), [query-api object ref lists](../../query-api/spec/object-ref-list-endpoints.md)

## Scope

Right column on the object detail page (`lg+`): preview blocks for Related, Similar, Add-On, and Followers. Full lists live in the **center column** on dedicated primary-tab routes.

Hidden in **Instagram** shell mode (`shell-hide-instagram`), same as profile right rail.

## Layout

- Shell: [`ObjectViewShell`](../../../../apps/web/src/modules/object/presentation/components/object-view-shell.tsx) — third grid column, class `shell-object-page-grid`.
- Width: **18rem** default, **22rem** in Twitter shell mode ([`theme.css`](../../../../apps/web/src/styles/theme.css)); wider than profile `--shell-right-width` for longer mini-card titles.
- Component: [`ObjectRightSidebar`](../../../../apps/web/src/modules/object/presentation/components/object-right-sidebar.tsx).

## Sections (top → bottom)

| Section | Visibility | Data source | Preview size | Show more |
| ------- | ------------ | ----------- | ------------ | --------- |
| **Related** | Object type supports `isRelatedTo` in registry **and** section has ≥1 item after fetch | `GET /query/v1/objects/:id/related` | 5 mini cards | `/object/:id/related` |
| **Similar** | `isSimilarTo` supported **and** ≥1 item | `GET .../similar` | 5 | `/object/:id/similar` |
| **Add-On** | `addOn` supported **and** ≥1 item | `GET .../add-on` | 5 | `/object/:id/add-on` |
| **Followers** | `followers_count > 0` on resolve **and** API returns ≥1 row | `GET .../followers` (`sort=rank`) | 5 accounts | `/object/:id/followers` |

Empty sections are **not rendered** (no placeholder card).

### Fetch limits (SSR)

| Block | Limit requested | Constant |
| ----- | ----------------- | -------- |
| Related / Similar / Add-On | `6` (5 shown + detect `hasMore`) | `RIGHT_RAIL_REF_FETCH_LIMIT` in [`object-ref-list.client.ts`](../../../../apps/web/src/modules/object/infrastructure/object-ref-list.client.ts) |
| Followers | `6` | `RIGHT_RAIL_FOLLOWERS_FETCH_LIMIT` in [`object-social.client.ts`](../../../../apps/web/src/modules/object/infrastructure/clients/object-social.client.ts) |

All right-rail data is loaded in [`page.tsx`](../../../../apps/web/src/app/(app)/object/[object-id]/page.tsx) on every object page view (not gated on active tab). Center-column feeds for the same tabs use separate SSR payloads when that tab is active.

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
- Shown when API `hasMore` is true (ref lists) or `hasMore || total > 5` (followers preview).

Path helpers: [`object-page-url.constants.ts`](../../../../apps/web/src/modules/object/domain/object-page-url.constants.ts) — `buildObjectRelatedPath`, `buildObjectSimilarPath`, `buildObjectAddOnPath`, `buildObjectFollowersPath`.

## Center column (full feeds)

When the user opens a ref tab or followers tab, the center column shows the full experience:

| Tab URL | Center UI | API page size |
| ------- | --------- | ------------- |
| `/object/:id/related` | [`ObjectRefListFeed`](../../../../apps/web/src/modules/object/presentation/components/object-ref-list-feed.tsx) + [`ObjectCard`](../object-card.md) | 20 (`REF_LIST_PAGE_SIZE`) |
| `/object/:id/similar` | same | 20 |
| `/object/:id/add-on` | same | 20 |
| `/object/:id/followers` | [`UserSocialAccountList`](../../../../apps/web/src/modules/user-social/presentation/components/user-social-account-list.tsx) | 20 (`USER_SOCIAL_PAGE_SIZE`) |

Ref center feeds support load-more via server action [`load-more-ref-list.actions.ts`](../../../../apps/web/src/app/(app)/object/[object-id]/related/load-more-ref-list.actions.ts).

Proxy: [`proxy.ts`](../../../../apps/web/src/proxy.ts) rewrites `/object/:id/<tab>` → `?tab=<tab>` for all segments in `OBJECT_PAGE_PATH_TAB_SEGMENTS` (includes `related`, `similar`, `add-on`, `followers`).

## Props wiring

```
page.tsx (SSR)
  → ObjectPageClient
      → ObjectViewShell.rightRail → ObjectRightSidebar
            related/similar/addOn from ObjectPageViewModel (mergeRightRailIntoModel)
            rightRailFollowersPage from getObjectFollowersPageQuery
```

Registry gate for ref sections: `objectTypeSupportsRefList` in `page.tsx` checks `OBJECT_TYPE_REGISTRY[objectTypeKey].supported_updates`.

## i18n

| Key | Use |
| ----- | --- |
| `object_right_related` | Related heading |
| `object_right_similar` | Similar heading |
| `object_right_add_on` | Add-On heading |
| `followers` | Followers heading |
| `object_right_show_more` | Show more link (all sections) |

## Verification

- Object with shop categories + ref/backfill data: Related and Similar sections differ when multiple categories exist (see query-api backfill rules).
- Object with `followers_count > 0`: Followers block at bottom of right rail.
- Show more navigates to clean path URLs above.
