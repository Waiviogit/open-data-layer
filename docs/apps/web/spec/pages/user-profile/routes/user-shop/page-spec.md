# User shop

## route_path

- `/@:name/user-shop`
- `/@:name/user-shop/:department`

**URL segment is kebab-case `user-shop`** (Next.js app router under `app/.../user-shop/`).

**Legacy router:** `path: '/(userShop)/:department?'` → `UserDepartmentsWobjList`.

## parent_route

[page-spec.md](../../page-spec.md).

## child_routes

None (department is optional path param).

## route_params

- `name`
- `department` — optional category slug for shop list.

## query_params

None required at route level; internal `ListSwitcher` / shop helpers may use navigation state (see component).

## layout

### persistent_regions

User shell; sidebars on.

### dynamic_regions

Center: `UserDepartmentsWobjList` with `ListSwitcher`.

## route_region_impact

| region | impact |
|--------|--------|
| left-sidebar | Visible. |
| center | Shop departments and product lists. |
| right-sidebar | Visible. |

## navigation

[UserMenu](../../components/user-menu.md) link to `/@:name/user-shop`.

## visible_blocks

| block | file path |
|-------|-----------|
| UserDepartmentsWobjList | `src/client/Shop/DepartmentsWobjList/UserDepartmentsWobjList.js` |
| ListSwitcher | `src/client/Shop/ListSwitch/ListSwitcher.js` |

## actions

`getUserShopList` in `fetchData` (`UserDepartmentsWobjList.fetchData`).

## state_model

- `shopStore` for breadcrumbs and lists.
- Path `waivio` vs social host selects `path` prop inside component.

## loading_behavior

Shop list fetch on route data load; list infinite scroll inside `ListSwitcher`.

## conditional_visibility

Waivio vs social mode from `isSocial` prop / environment.

## child_route_integration

Same component as [recipe](../recipe/page-spec.md) with different `recipe` vs `userShop` schema.

## References

- [../../page-spec.md](../../page-spec.md)
- [../recipe/page-spec.md](../recipe/page-spec.md)
- [../../components/user-departments-wobj-list.md](../../components/user-departments-wobj-list.md)

```yaml
integration_contract:
  input_data: match.params.name, department, host/social mode.
  emitted_actions: getUserShopList, department navigation.
  controlled_by_state: shop store, route match.
  affected_by_route: userShop segment + optional department.
  affected_by_query: none documented.
```
