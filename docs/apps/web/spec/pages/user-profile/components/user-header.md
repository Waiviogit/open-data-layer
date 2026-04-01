# UserHeader

## metadata

| field | value |
|-------|-------|
| name | UserHeader |
| source | `src/client/user/UserHeader/UserHeader.js` |
| type | Class/functional header block |

## structure

- Avatar, name, meta, follow/mute UI, edit profile link for own user.

## inputs

- `user`, `username`, `isSameUser`, `coverImage`, `hasCover`, `isActive`, `isGuest`.

## state

- Local UI state for popovers/menus as implemented.

## actions

- Follow/unfollow, mute, bell — via connected actions and `UserPopoverMenu`.

## rendering

- Cover + profile row.

## emitted events

- Social actions to Redux/API.

## References

- [user-hero.md](user-hero.md)
- [../page-spec.md](../page-spec.md)

```yaml
integration_contract:
  input_data: User object, session user, moderator flags.
  emitted_actions: Follow, mute, notifications.
  controlled_by_state: User slice, auth.
  affected_by_route: none.
  affected_by_query: none.
```
