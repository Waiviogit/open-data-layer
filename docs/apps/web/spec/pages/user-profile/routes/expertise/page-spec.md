# Expertise (hashtags / objects)

## route_path

- `/@:name/expertise-hashtags`
- `/@:name/expertise-objects`

**Router:** `path: '/(expertise-hashtags|expertise-objects)'` → `UserExpertise`.

## parent_route

[page-spec.md](../../page-spec.md).

## child_routes

None.

## route_params

- `name`
- `0` — `expertise-hashtags` | `expertise-objects`

## query_params

None.

## layout

Standard shell; sidebars visible.

## route_region_impact

| region | impact |
|--------|--------|
| left-sidebar | Visible. |
| center | Tabs + `ObjectDynamicList`. |
| right-sidebar | Visible. |

## navigation

[UserMenu](../../components/user-menu.md) → `/@:name/expertise-hashtags`.

## visible_blocks

| block | file path |
|-------|-----------|
| UserExpertise | `src/client/user/UserExpertise.js` |
| ObjectDynamicList | `src/client/object/ObjectDynamicList.js` |

## actions

`getUrerExpertiseCounters`, `getObjectsList` via dynamic list.

## state_model

Expertise counters from `userStore` selectors.

## loading_behavior

List infinite scroll; counters on mount.

## conditional_visibility

Content pane switches by pathname includes `expertise-hashtags` vs objects.

## child_route_integration

N/A.

## References

- [../../page-spec.md](../../page-spec.md)
- [../../components/user-expertise.md](../../components/user-expertise.md)
- [../../tabs/expertise-tabs.md](../../tabs/expertise-tabs.md)

```yaml
integration_contract:
  input_data: name, tab param 0, locale.
  emitted_actions: fetch expertise lists and counters.
  controlled_by_state: user expertise counters, dynamic list.
  affected_by_route: expertise-hashtags | expertise-objects.
  affected_by_query: none.
```
