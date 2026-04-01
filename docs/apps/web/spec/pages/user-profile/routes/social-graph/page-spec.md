# Social graph (followers, following, following-objects)

## route_path

- `/@:name/followers`
- `/@:name/following`
- `/@:name/following-objects`

**Router:** `path: '/(followers|following|following-objects)'` → `UserFollowers`.

## parent_route

[page-spec.md](../../page-spec.md).

## child_routes

None.

## route_params

- `name`
- `0` — `followers` | `following` | `following-objects`

## query_params

None in route; sorting uses **Redux** `getAuthorizationUserFollowSort` (not query).

## layout

### persistent_regions

User shell + sidebars (default).

### dynamic_regions

Center: `UserFollowers` tabs content.

## route_region_impact

| region | impact |
|--------|--------|
| left-sidebar | Visible. |
| center | Three tab panes with dynamic lists. |
| right-sidebar | Visible. |

## navigation

`Tabs` with `Link` targets per segment.

## visible_blocks

| block | file path |
|-------|-----------|
| UserFollowers | `src/client/user/UserFollowers.js` |
| UserDynamicList | `src/client/user/UserDynamicList.js` |
| ObjectDynamicList | `src/client/object/ObjectDynamicList.js` (following-objects) |

## actions

`changeSorting` (auth), `getUsersList` / `getObjectsList` via `fetchData` patterns.

## state_model

- `sort` from Redux (`getAuthorizationUserFollowSort`).
- `user` counts for tab labels.

## loading_behavior

Lists load via dynamic list store; `fetchData` on route in `UserFollowers`.

## conditional_visibility

Tab content rendered only when `tab ===` active segment.

## child_route_integration

N/A.

## References

- [../../page-spec.md](../../page-spec.md)
- [../../components/user-followers.md](../../components/user-followers.md)
- [../../tabs/followers-tabs.md](../../tabs/followers-tabs.md)

```yaml
integration_contract:
  input_data: match.params, user counts, auth sort preference.
  emitted_actions: changeSorting, dynamic list fetch.
  controlled_by_state: sort in Redux; tab from route param 0.
  affected_by_route: followers | following | following-objects.
  affected_by_query: none.
```
