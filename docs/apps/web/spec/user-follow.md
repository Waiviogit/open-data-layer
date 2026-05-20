# User follow (profile hero & social lists)

**Back:** [web overview](overview.md) · **Related:** [object-follow.md](object-follow.md), [chain-indexer ODL pipeline](../../chain-indexer/spec/odl-pipeline.md), [chain-indexer social parsers](../../chain-indexer/spec/social-parsers.md)

## Route context

- Profile hero: `UserProfileHeroClient` on `/@{account}` (layout under `user-profile/[name]`).
- Account lists: `UserSocialAccountRow` on `/@{account}/followers` and `/@{account}/following`.
- Objects tab: `UserSocialObjectRow` on `/@{account}/following-objects` (viewer **Unfollow** per object via ODL `object_follow`).

## Follow / Unfollow (user-to-user)

- Broadcasts standard Hive `custom_json` with `id: "follow"` via `buildHiveFollowOp` / `buildHiveUnfollowOp` (`what: ["blog"]` / `what: []`).
- Indexed by existing `FollowSocialService` into `user_subscriptions`.
- UI: **Follow** / **Following** with hover → **Unfollow** (same pattern as object hero).
- Optimistic toggle; `router.refresh()` after `awaitTrxConfirmation`.

## Bell (user subscriptions)

- Shown on profile hero when `isFollowing` is true.
- Broadcasts ODL `user_follow` with `method: 'bell'` via `buildOdlUserFollowBellOp`.
- Indexed by `FollowUserBellHandler` → `user_subscriptions.bell`.
- Reflected as `viewer_bell` on `GET /query/v1/users/{name}/profile` when `X-Viewer` is set.

## Initial state (profile)

From `UserProfileShellUser` (`isFollowing`, `viewerBell`), mapped from query-api profile:

- `is_following` — viewer has a `user_subscriptions` row to this account.
- `viewer_bell` — `bell` on that row (false when not following or null).

## Object unfollow (following-objects tab)

- Logged-in viewer sees **Unfollow** on each row.
- Broadcasts ODL `object_follow` `method: 'unfollow'` via `buildOdlObjectFollowOp`.
- Row removed optimistically from the list on success.

## Verification

- `pnpm nx test hive-broadcast` — Hive follow + `buildOdlUserFollowBellOp` specs
- `pnpm nx test chain-indexer --testPathPatterns=follow-user-bell`
- Manual: follow user from profile hero, toggle bell, unfollow from following list and objects tab
