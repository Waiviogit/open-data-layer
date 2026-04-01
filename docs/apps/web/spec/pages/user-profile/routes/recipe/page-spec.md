# Recipe (user recipe lists)

## route_path

- `/@:name/recipe`
- `/@:name/recipe/:department`

**Router:** `path: '/recipe/:department?'` → `UserDepartmentsWobjList` (same component as user shop).

## parent_route

[page-spec.md](../../page-spec.md).

## child_routes

None.

## route_params

- `name`
- `department` — optional.

## query_params

None at route level (see [user-shop](../user-shop/page-spec.md) / `ListSwitcher`).

## layout

Same as user shop: sidebars visible; center is recipe schema.

## route_region_impact

| region | impact |
|--------|--------|
| left-sidebar | Visible. |
| center | Recipe departments/lists. |
| right-sidebar | Visible. |

## navigation

[UserMenu](../../components/user-menu.md) → `/@:name/recipe`.

## visible_blocks

| block | file path |
|-------|-----------|
| UserDepartmentsWobjList | `src/client/Shop/DepartmentsWobjList/UserDepartmentsWobjList.js` |

## actions

`getUserShopList` with `recipe` schema (`getUserShopSchema` from pathname).

## state_model

`getUserShopSchema(history.location.pathname) === 'recipe'` drives paths.

## loading_behavior

Same as user shop `fetchData`.

## conditional_visibility

N/A.

## child_route_integration

See [user-shop](../user-shop/page-spec.md).

## References

- [../../page-spec.md](../../page-spec.md)
- [../user-shop/page-spec.md](../user-shop/page-spec.md)
- [../../components/user-departments-wobj-list.md](../../components/user-departments-wobj-list.md)

```yaml
integration_contract:
  input_data: name, department, pathname for schema recipe vs userShop.
  emitted_actions: getUserShopList for recipe schema.
  controlled_by_state: shop store.
  affected_by_route: recipe + optional department.
  affected_by_query: none documented.
```
