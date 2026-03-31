# Component spec: Other profile routes (non-wallet aggregate)

## parent_context

- [../page-spec.md](../page-spec.md) — center column for all listed segments

## Role

Single spec file aggregating **followers**, **favorites**, **shop/recipe**, **map**, **reblogs**, **expertise**, and **about** child routes. Each subsection is a **logical block**; implementation spans multiple source files.

## Route segments → blocks

| Segment(s) | Block | Modal / extra |
|------------|-------|---------------|
| `followers` / `following` / `following-objects` | Tabs + user/object lists | Sort control → auth preferences |
| `favorites` / `:objectType` | Type filter + infinite grid + mobile sidenav | — |
| `userShop` / `recipe` + department | ListSwitcher + departments | — |
| `map` | User map / empty favorites | WebsiteBody |
| `reblogs` | Feed + post modal | `PostModal` (app-level) |
| `expertise-hashtags` / `expertise-objects` | Tabs + object lists | — |
| `about` | Long-form profile + tokens | Link safety dispatch for website |

## Contains (by reference to behavior, not separate spec files)

- Followers three-tab system — **tabs** documented here only
- Favorites infinite list + `FavoritesMobileSidenav` — **internal state** `visible` for mobile drawer
- Shop/recipe `ListSwitcher` — department navigation
- Map `WebsiteBody` — hover state for card/map linkage
- Reblogs `Feed` + empty states
- Expertise two-tab system
- About `UserInfo` — email `mailto`, website click → safety flow

## integration_contract

```yaml
integration_contract:
  input_data:
    - route_segment
    - optional_department_param
    - optional_object_type_param
  emitted_actions:
    - navigation
    - infinite_scroll_fetch
    - set_link_safety_modal  # about website
  controlled_by_page_state:
    - dynamic_list_store
    - favorites_store
    - feed_store
```

## References

- [../page-spec.md](../page-spec.md) — parent shell and route table
- [user-menu.md](user-menu.md) — nav to these segments
- [posts-comments-activity-tabs.md](posts-comments-activity-tabs.md) — orthogonal tabs on home feed
