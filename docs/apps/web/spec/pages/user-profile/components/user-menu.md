# UserMenu

## metadata

| field | value |
|-------|-------|
| name | UserMenu |
| source | `src/client/components/UserMenu.js` |
| type | Functional + selectors |

## structure

- Horizontal list of `Link` items with active class from `useParams` `0` tab.

## inputs

- `followers` (count), optional `onChange`/`defaultKey` (legacy props from wrapper).

## state

- `useParams`: `name`, `0` as tab.
- `useSelector`: `getIsWaivio`, `getIsSocial` for shop/map/recipe/favorites visibility.

## actions

- None; navigation via `Link`.

## rendering

- Links: `/@name`, `/@name/map`, `/@name/user-shop`, `/@name/recipe`, `/@name/favorites`, `/@name/transfers?type=WAIV`, `/@name/followers`, `/@name/expertise-hashtags`, `/@name/about`.

## emitted events

- None (declarative links).

## References

- [../page-spec.md](../page-spec.md)
- [../tabs/global-user-menu.md](../tabs/global-user-menu.md)

```yaml
integration_contract:
  input_data: name, current tab segment, app mode flags.
  emitted_actions: Navigation via Link.
  controlled_by_state: URL pathname + app selectors.
  affected_by_route: Primary profile sections.
  affected_by_query: transfers default type=WAIV on link.
```
