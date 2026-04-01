# About

## route_path

- `/@:name/about`

**Router:** `path: '/about'` → `UserInfo`.

## parent_route

[page-spec.md](../../page-spec.md).

## child_routes

None.

## route_params

- `name`

## query_params

None.

## layout

**Left sidebar hidden** (`isAboutPage` in `User.js`).

## route_region_impact

| region | impact |
|--------|--------|
| left-sidebar | **Hidden** (`display-none` on left column). |
| center | `UserInfo` with padding class `pa3` on container. |
| right-sidebar | Visible. |

## navigation

[UserMenu](../../components/user-menu.md) → `/@:name/about`.

## visible_blocks

| block | file path |
|-------|-----------|
| UserInfo | `src/client/app/Sidebar/UserInfo/UserInfo.js` |

## actions

Profile metadata display; editing links may go to settings (outside this route).

## state_model

User metadata from Redux user record.

## loading_behavior

Follows shell `loaded` gate.

## conditional_visibility

N/A.

## child_route_integration

N/A.

## References

- [../../page-spec.md](../../page-spec.md)
- [../../components/user-info.md](../../components/user-info.md)

```yaml
integration_contract:
  input_data: user profile from Redux for name.
  emitted_actions: none required for read-only about.
  controlled_by_state: users store.
  affected_by_route: about segment.
  affected_by_query: none.
```
