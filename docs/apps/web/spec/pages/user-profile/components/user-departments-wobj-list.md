# UserDepartmentsWobjList

## metadata

| field | value |
|-------|-------|
| name | UserDepartmentsWobjList |
| source | `src/client/Shop/DepartmentsWobjList/UserDepartmentsWobjList.js` |
| type | Functional |

## structure

- `ListSwitcher` with `getDepartmentsFeed`, paths for waivio vs social.

## inputs

- `isSocial` prop; `match.params` from router (`name`, `department`).

## state

- Derived `isRecipe` from `getUserShopSchema(pathname)`.

## actions

- `getUserShopList` in static `fetchData`.

## rendering

- Department navigation + product/object lists.

## emitted events

- Shop actions via list switcher.

## References

- [../routes/user-shop/page-spec.md](../routes/user-shop/page-spec.md)
- [../routes/recipe/page-spec.md](../routes/recipe/page-spec.md)

```yaml
integration_contract:
  input_data: name, department, pathname schema recipe vs userShop.
  emitted_actions: getUserShopList, navigate departments.
  controlled_by_state: shop store.
  affected_by_route: userShop and recipe paths.
  affected_by_query: none.
```
