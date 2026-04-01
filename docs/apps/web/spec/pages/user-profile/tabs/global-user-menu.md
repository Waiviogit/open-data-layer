# Global user menu (primary nav)

## tabs

Not Ant Design tabs — horizontal **links** in [`UserMenu`](../components/user-menu.md): Posts (base), Map, Shop (`user-shop`), Recipe, Favorites, Wallet, Followers, Expertise, About.

## active source

- **Route:** first path segment after `/@:name` from `useParams()['0']`; base profile uses empty segment and `UserMenu` maps active styling via includes (see `UserMenu.js`).

## switching

- Declarative `<Link>`; no in-place state switch without navigation.

## affected region

- **Center** (child route); shell header stays.

## References

- [../components/user-menu.md](../components/user-menu.md)
- [../page-spec.md](../page-spec.md)

```yaml
integration_contract:
  input_data: name, current path segment, waivio/social flags.
  emitted_actions: Client navigation.
  controlled_by_state: Router location.
  affected_by_route: Primary /@:name/* sections.
  affected_by_query: default type=WAIV on wallet link only.
```
