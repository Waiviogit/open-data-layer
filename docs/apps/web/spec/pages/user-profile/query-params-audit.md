# Query parameters audit (user profile scope)

Consolidated from route and component specs. **Data** = fetching/state; **layout** = UI chrome or visibility; **tab** = active tab selection.

| name | routes / components | affects |
|------|---------------------|---------|
| `type` | `/@:name/transfers`, [`Wallets`](../components/wallets.md) | data, tab |
| `tab` | `/@:name/transfers/waiv-table`, [`WalletTableSwitcher`](../components/wallet-table-switcher.md), `TableFilter`, `GenerateReport` | data, layout, tab |
| `tags` | Feed via `UserBlog` / [feed](routes/feed/page-spec.md) | data |
| `display` | [`Wrapper`](../../src/client/Wrapper.js) (widget mode) | layout (global header) |
| Map bundle | `/@:name/map` [`WebsiteBody`](components/website-body-map.md): `type`, `center`, `permlink`, `searchString`, `showPanel`, tag filters via `location.search` | data, layout |

Canonical URL on user shell preserves full query string for SEO ([`User.js`](../../src/client/user/User.js) `getQueryString`).

## References

- [page-spec.md](page-spec.md)
- [routes/map/page-spec.md](routes/map/page-spec.md)
- [routes/transfers/page-spec.md](routes/transfers/page-spec.md)
- [routes/transfers-waiv-table/page-spec.md](routes/transfers-waiv-table/page-spec.md)
- [routes/feed/page-spec.md](routes/feed/page-spec.md)

```yaml
integration_contract:
  input_data: location.search per route.
  emitted_actions: Store updates and history pushes from map/wallet flows.
  controlled_by_state: URLSearchParams + Redux.
  affected_by_route: See route column.
  affected_by_query: This table.
```
