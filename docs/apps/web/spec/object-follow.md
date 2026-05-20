# Object follow (hero)

**Back:** [web overview](overview.md) · **Related:** [object-updates-feed.md](object-updates-feed.md), [chain-indexer ODL pipeline](../../chain-indexer/spec/odl-pipeline.md)

## Route context

Object detail hero (`ObjectHero` on `/object/[object-id]`) exposes **Follow**, **Following** (hover → **Unfollow**), and a **Bell** control when the viewer is following.

## Follow / Unfollow

- Broadcasts ODL `object_follow` with `method: 'follow' | 'unfollow'` via `buildOdlObjectFollowOp` (`@opden-data-layer/hive-broadcast`).
- UI updates optimistically; after `awaitTrxConfirmation`, `router.refresh()` reloads server data.
- Unfollow also clears bell optimistically in the client.

## Bell

- Shown only when `isFollowing` is true.
- Broadcasts `method: 'bell'` with `bell: true | false`.
- Indexed into `user_object_follows.bell`; reflected as `viewer_bell` on resolve.

## Initial state

From `ObjectPageViewModel` (`isFollowing`, `viewerBell`), mapped from query-api `POST /query/v1/objects/resolve`:

- `is_following` — viewer has a row in `user_object_follows` for this object (`X-Viewer` required).
- `viewer_bell` — `bell` on that row (false when not following).

## Data model

`user_object_follows (account, object_id, bell, created_at)` — primary key `(account, object_id)`.

## Verification

- `pnpm nx test hive-broadcast` — `buildOdlObjectFollowOp` specs
- `pnpm nx test chain-indexer --testPathPatterns=follow-object`
- Manual: follow object as logged-in user, confirm bell toggle and refreshed resolve payload
