# Component spec: Posts / threads / comments / mentions / activity

## parent_context

- [../page-spec.md](../page-spec.md) — center column child route for base profile paths

## Role

Nested tab system for the default profile content area when the user is not muted for the viewer.

## Tab system linking

| Tab key | Label | Navigates to | Content component (concept) |
|---------|-------|--------------|----------------------------|
| `posts` | Posts | `/@name` | User blog |
| `threads` | Threads | `/@name/threads` | Threads list |
| `comments` | Comments | `/@name/comments` | User comments |
| `mentions` | Mentions | `/@name/mentions` | Mentions list |
| `activity` | Activity | `/@name/activity` | Activity stream |

- **Parent page:** [../page-spec.md](../page-spec.md)
- **Switching behavior:** URL changes via `Link` in tab labels; `activeKey` from route. Only matching tab body renders (`tab === 'posts' && …`).

## Inputs (conceptual)

| Input | Description |
|--------|-------------|
| `profileUser` | For mute check |
| `viewerName` | Authenticated username |
| `routeSegment` | `match.params['0']` — drives which tab body renders |

## Conditional: muted profile

If the user is muted or the viewer is in the user’s `mutedBy` list:

- Entire tab area is replaced by an **empty muted profile** message (no posts UI).

## Per-tab dynamic content

| Tab | Loading behavior |
|-----|------------------|
| Posts | Feed store loading / infinite scroll |
| Threads | Threads fetch + scroll |
| Comments | Comments fetch |
| Mentions | Mentions fetch |
| Activity | Activity fetch |

Each child owns **partial loading** (not a full document reload).

## integration_contract

```yaml
integration_contract:
  input_data:
    - profile_user_mute_state
    - route_segment_tab
  emitted_actions: []
  controlled_by_page_state:
    - react_router_match_params
```

## Uncertain

Inactive Ant Design `TabPane` content may remain mounted depending on library version; code **intends** only the active tab’s content via conditional render.

## References

- [../page-spec.md](../page-spec.md) — parent route shell
- [user-menu.md](user-menu.md) — primary nav also highlights “Posts” aggregate for these segments
