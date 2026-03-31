# Component spec: User menu (profile top navigation)

## parent_context

- [../page-spec.md](../page-spec.md) — User profile shell (persistent region under hero)

## Role

Primary horizontal navigation for the profile. Drives **SPA navigation** only (no isolated tab state).

## Placement

Rendered under the profile header inside the user hero stack (`UserHero`).

## Tab system linking

- **Parent page:** [../page-spec.md](../page-spec.md)
- **Content switched by routes:** Not a single component swap — each link navigates to a **different child route** (posts tabs, wallet, followers, etc.). See [posts-comments-activity-tabs.md](posts-comments-activity-tabs.md) for **secondary** tabs on the default feed area.

## Inputs (conceptual)

| Input | Description |
|--------|-------------|
| `profileName` | `name` route param |
| `followersCount` | Number shown next to Followers label |
| `followingCount` | Used in wrapper historically; menu displays follower count on Followers item |
| `showCommerceTabs` | Waivio or Social app mode → Map, Shop, Recipes, Favorites visible |

## Structure

- Container: horizontal `ul` inside a constrained row (`container menu-layout`).
- Each item: `li` with class indicating **active** when current `routeSegment` matches a defined set.

## Items and navigation

See [page-spec.md](../page-spec.md) navigation matrix. Wallet always deep-links with `?type=WAIV`.

## Active state rules

- `useParams()` provides `0: tab` defaulting to `'posts'` when absent.
- `getItemClasses(keys)` marks active if `tab` is in `keys`.

## Interactions

| Action | Trigger | Immediate UI | Modal / nav | State |
|--------|---------|--------------|-------------|-------|
| Go to Posts | Click Posts | — | Navigate `/@name` | URL |
| Go to Map / Shop / … | Click | — | Navigate | URL |
| Go to Wallet | Click Wallet | — | Navigate `/@name/transfers?type=WAIV` | URL |
| Go to Followers | Click | — | Navigate `/@name/followers` | URL |
| Go to Expertise / About | Click | — | Navigate | URL |

## integration_contract

```yaml
integration_contract:
  input_data:
    - route_segment
    - followers_count
    - app_flavor_flags
  emitted_actions: []
  controlled_by_page_state:
    - react_router_location
```

## References

- [../page-spec.md](../page-spec.md) — parent shell and `extracted_to` index
- [posts-comments-activity-tabs.md](posts-comments-activity-tabs.md) — secondary tabs on feed area (orthogonal to this nav)
