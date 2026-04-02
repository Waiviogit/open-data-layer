# Global user menu (primary nav)

## tabs

Not Ant Design tabs — horizontal **links** in [`UserMenu`](../components/user-menu.md): Posts (base), Map, Shop (`userShop`), Recipe, Favorites, Wallet, Followers, Expertise, About.

## Submenus (secondary navigation)

Logical grouping is documented in tab specs and child route specs. In **`apps/web`**, for Posts, Wallet, Followers, and Expertise, secondary links render as a **second row** under the primary links in [`UserMenu`](../components/user-menu.md) (same header). Other presentations (e.g. in-page tabs in the center column elsewhere) remain possible; URL contracts stay the same. Primary items without a submenu row in the spec have a single destination.

| Primary `UserMenu` item | Tab / secondary spec | Child route specs |
|-------------------------|----------------------|-------------------|
| Posts | [feed-posts-tabs.md](feed-posts-tabs.md) | [routes/feed/page-spec.md](../routes/feed/page-spec.md) |
| Wallet | [wallet-type-tabs.md](wallet-type-tabs.md), [waiv-table-tabs.md](waiv-table-tabs.md) | [routes/transfers/page-spec.md](../routes/transfers/page-spec.md), [routes/transfers-table/page-spec.md](../routes/transfers-table/page-spec.md), [routes/transfers-waiv-table/page-spec.md](../routes/transfers-waiv-table/page-spec.md), [routes/transfers-details/page-spec.md](../routes/transfers-details/page-spec.md) |
| Followers | [followers-tabs.md](followers-tabs.md) | [routes/social-graph/page-spec.md](../routes/social-graph/page-spec.md) |
| Expertise | [expertise-tabs.md](expertise-tabs.md) | [routes/expertise/page-spec.md](../routes/expertise/page-spec.md) |

Query details for wallet (`type`, `tab`) are centralized in [query-params-audit.md](../query-params-audit.md); do not duplicate here.

## active source

- **Route:** segments after `/@:name` (base profile uses an empty first segment). **`apps/web`:** [`getSegmentsAfterAccount`](../../../../../../../apps/web/src/modules/user-profile/presentation/components/profile-path.ts) + wallet `type` from `URLSearchParams` for the wallet submenu.

## switching

- Declarative `<Link>`; no in-place state switch without navigation.

## affected region

- **Center** (child route); shell header stays.

## References

- [../components/user-menu.md](../components/user-menu.md)
- [../page-spec.md](../page-spec.md)
- [feed-posts-tabs.md](feed-posts-tabs.md)
- [wallet-type-tabs.md](wallet-type-tabs.md)
- [waiv-table-tabs.md](waiv-table-tabs.md)
- [followers-tabs.md](followers-tabs.md)
- [expertise-tabs.md](expertise-tabs.md)
- [../query-params-audit.md](../query-params-audit.md)

```yaml
integration_contract:
  input_data: name, current path segment, waivio/social flags.
  emitted_actions: Client navigation.
  controlled_by_state: Router location.
  affected_by_route: Primary /@:name/* sections.
  affected_by_query: default type=WAIV on wallet link only.
```

```yaml
integration_contract_submenus:
  input_data: name, route segment 0, query where applicable (see query-params-audit).
  emitted_actions: Client navigation to child paths or tab URLs.
  controlled_by_state: Router location + URLSearchParams on wallet flows.
  affected_by_route: Child paths under feed, social-graph, transfers*, expertise.
  affected_by_query: type on /transfers; tab on /transfers/waiv-table; see query-params-audit.
```
