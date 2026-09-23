---
id: web-pages-user-profile-components-user-menu
title: UserMenu
description: "- **Primary:** horizontal list of `Link` items; active class from pathname segments after `/@:name` (see `profile-path.ts`). - **Secondary (submenu):** when the active primary section is Posts, Wallet, Followers, or Expertise, a second row of `Link` items appears below the primary row (same header card). Labels and `aria-label` use i18n; styling uses design tokens (semantic Tailwind classes). Helpers: `user-profile-subnav.ts`."
type: spec
status: active
scope: web
tags: [web, page, user-profile, components]
updated_at: 2026-09-23
related:
  - docs/apps/web/spec/overview.md
  - docs/apps/web/spec/pages/user-profile/profile-shell.md
  - docs/apps/web/spec/pages/index.md
  - docs/apps/web/spec/pages/user-profile/routes/feed.md
  - docs/apps/web/spec/pages/user-profile/routes/transfers.md
  - docs/apps/web/spec/pages/user-profile/routes/permissions.md
  - docs/apps/web/spec/pages/user-profile/routes/social-graph.md
  - docs/apps/web/spec/pages/user-profile/routes/expertise.md
---

# UserMenu

## metadata

| field | value |
|-------|-------|
| name | UserMenu |
| source | [`apps/web/src/modules/user-profile/presentation/components/user-menu.tsx`](../../../../../../../apps/web/src/modules/user-profile/presentation/components/user-menu.tsx) |
| type | Client component |

## structure

- **Primary:** horizontal list of `Link` items; active class from pathname segments after `/@:name` (see [`profile-path.ts`](../../../../../../../apps/web/src/modules/user-profile/presentation/components/profile-path.ts)).
- **Secondary (submenu):** when the active primary section is Posts, Wallet, Followers, or Expertise, a second row of `Link` items appears below the primary row (center column card on `(main)` routes). Labels and `aria-label` use i18n; styling uses design tokens (semantic Tailwind classes). Helpers: [`user-profile-subnav.ts`](../../../../../../../apps/web/src/modules/user-profile/presentation/components/user-profile-subnav.ts).

## Mobile layout

Below `lg`, primary and submenu rows stay on **one horizontal line** and scroll when overflowed (shared `horizontal-tab-nav-classes.ts`). Submenu sits in a bordered card with horizontal bleed into card padding.

## navigation layers

- **Primary:** one link per main section — see [rendering](#rendering).
- **Secondary:** route-aligned links for Posts, Wallet, Followers, and Expertise only — see [Secondary subnav](#secondary-subnav). Wallet submenu uses `?type=` for active state ([transfers.md](../routes/transfers.md)).

## Secondary subnav

Shown when `getSubmenuVariant(pathname)` returns a variant (see `user-profile-subnav.ts`).

| Primary active | Secondary links | Route spec |
|----------------|-----------------|------------|
| Posts (default feed) | `/@:name`, `/threads`, `/comments`, `/mentions`, `/activity` | [feed.md](../routes/feed.md) |
| Wallet (`/transfers`, `/permissions`) | `?type=WAIV`, `?type=HIVE`, `?type=ENGINE`, `/@:name/permissions` | [transfers.md](../routes/transfers.md), [permissions.md](../routes/permissions.md) |
| Followers section | `/followers`, `/following`, `/following-objects` (counts from social context) | [social-graph.md](../routes/social-graph.md) |
| Expertise | `/expertise-hashtags`, `/expertise-objects` | [expertise.md](../routes/expertise.md) |

WAIV table page (`/@:name/transfers/waiv-table`) may use a separate `tab` query for in-page tabs — not part of this header submenu.

## Query params (UserMenu)

| Param | Where | Effect |
|-------|-------|--------|
| `type` | `/transfers` and wallet currency links | Active WAIV / HIVE / ENGINE tab; default `WAIV` when missing (`getWalletTypeFromSearch`). Not used on `/permissions`. |
| `tab` | `/transfers/waiv-table` only | In-page WAIV table tabs (not header submenu) |

## inputs

- `accountName`, `pathname`, `search` (query string for wallet `type`).

## state

- Derived from `pathname` + `search` (no local nav state).

## actions

- Navigation via `Link` only.

## rendering

- **Primary links:** `/@name`, `/@name/map`, `/@name/user-shop`, `/@name/recipe`, `/@name/favorites`, `/@name/transfers?type=WAIV`, `/@name/followers`, `/@name/expertise-hashtags`, `/@name/about`.
- **Secondary row:** URLs in [Secondary subnav](#secondary-subnav). Feed secondary hidden on desktop when `getDesktopMenuKeys(shellMode)` restricts primary keys.

## emitted events

- None (declarative links).

## References

- [profile-shell.md](../profile-shell.md)
- [feed.md](../routes/feed.md)
- [transfers.md](../routes/transfers.md)
- [permissions.md](../routes/permissions.md)
- [social-graph.md](../routes/social-graph.md)
- [expertise.md](../routes/expertise.md)

```yaml
integration_contract:
  input_data: name, pathname segments, search params for wallet type.
  emitted_actions: Navigation via Link.
  controlled_by_state: URL pathname + query.
  affected_by_route: Primary profile sections.
  affected_by_query: transfers default type=WAIV on primary wallet link; type on wallet submenu.
```

```yaml
integration_contract_submenus:
  input_data: same as primary; child paths and query per route specs above.
  emitted_actions: Navigation via Link on secondary row.
  controlled_by_state: Router pathname + URLSearchParams (wallet type).
  affected_by_route: feed, social-graph, transfers, permissions, expertise children.
  affected_by_query: type on /transfers; tab on waiv-table page only.
```
