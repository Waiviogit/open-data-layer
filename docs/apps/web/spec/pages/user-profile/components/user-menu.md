# UserMenu

## metadata

| field | value |
|-------|-------|
| name | UserMenu |
| source | [`apps/web/src/modules/user-profile/presentation/components/user-menu.tsx`](../../../../../../../apps/web/src/modules/user-profile/presentation/components/user-menu.tsx) |
| type | Client component |

## structure

- **Primary:** horizontal list of `Link` items; active class from pathname segments after `/@:name` (see [`profile-path.ts`](../../../../../../../apps/web/src/modules/user-profile/presentation/components/profile-path.ts)).
- **Secondary (submenu):** when the active primary section is Posts, Wallet, Followers, or Expertise, a second row of `Link` items appears below the primary row (same header card). Labels and `aria-label` use i18n; styling uses design tokens (semantic Tailwind classes). Helpers: [`user-profile-subnav.ts`](../../../../../../../apps/web/src/modules/user-profile/presentation/components/user-profile-subnav.ts).

## navigation layers

- **Primary:** one link per main section — see [rendering](#rendering).
- **Secondary:** route-aligned links for those four sections only; URL details are specified in the tab specs linked from [global-user-menu.md](../tabs/global-user-menu.md) (not duplicated here). Wallet submenu uses `?type=` for active state.

## inputs

- `accountName`, `pathname`, `search` (query string for wallet `type`).

## state

- Derived from `pathname` + `search` (no local nav state).

## actions

- Navigation via `Link` only.

## rendering

- **Primary links:** `/@name`, `/@name/map`, `/@name/user-shop`, `/@name/recipe`, `/@name/favorites`, `/@name/transfers?type=WAIV`, `/@name/followers`, `/@name/expertise-hashtags`, `/@name/about`.
- **Secondary row** (when that primary section is active): see [global-user-menu.md](../tabs/global-user-menu.md) § Submenus and [feed-posts-tabs.md](../tabs/feed-posts-tabs.md), [wallet-type-tabs.md](../tabs/wallet-type-tabs.md), [followers-tabs.md](../tabs/followers-tabs.md), [expertise-tabs.md](../tabs/expertise-tabs.md). WAIV table `tab` query ([waiv-table-tabs.md](../tabs/waiv-table-tabs.md)) is not part of this header submenu.

## emitted events

- None (declarative links).

## References

- [../page-spec.md](../page-spec.md)
- [../tabs/global-user-menu.md](../tabs/global-user-menu.md)
- [../tabs/feed-posts-tabs.md](../tabs/feed-posts-tabs.md)
- [../tabs/wallet-type-tabs.md](../tabs/wallet-type-tabs.md)
- [../tabs/waiv-table-tabs.md](../tabs/waiv-table-tabs.md)
- [../tabs/followers-tabs.md](../tabs/followers-tabs.md)
- [../tabs/expertise-tabs.md](../tabs/expertise-tabs.md)
- [../query-params-audit.md](../query-params-audit.md)

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
  input_data: same as primary; child paths and query per tab specs.
  emitted_actions: Navigation via Link on secondary row.
  controlled_by_state: Router pathname + URLSearchParams (wallet type).
  affected_by_route: feed, social-graph, transfers*, expertise children.
  affected_by_query: see query-params-audit for wallet and waiv-table.
```
