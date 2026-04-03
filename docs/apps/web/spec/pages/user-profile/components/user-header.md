# UserHeader

**Back:** [web overview](../../../overview.md) · **Related:** [user-hero.md](user-hero.md), [../page-spec.md](../page-spec.md), [avatar](../../../components/avatar.md)

## metadata

| field | value |
|-------|-------|
| name | UserHeader |
| source | `apps/web/src/modules/user-profile/presentation/components/user-header.tsx` |
| type | Client component — profile hero band (cover + avatar row + actions) |

## structure

- Cover image (when `coverImage` set).
- **Avatar:** shared [`UserAvatar`](../../../components/avatar.md) with `user.avatarUrl` from query-api (`UserProfileShellUser`), `username`, `displayName: user.displayName`, `size` 96px; loading skeleton while `isHeroLoading`.
- Display name, `@username`, guest badge, bio, follower/following/post counts.
- Actions: follow, edit profile, transfer (placeholders wired).

## inputs

- `user`, `username`, `isSameUser`, `isGuest`, `hasCover`, `coverImage`, `isHeroLoading`, `onTransferClick`, `onFollowClick`.

## Data

- `user.avatarUrl` is populated by the profile query (see [data-loading.md](../data-loading.md)).

## References

- [user-hero.md](user-hero.md)
- [../page-spec.md](../page-spec.md)
