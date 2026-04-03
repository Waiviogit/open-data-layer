# UserAvatar (shared)

**Back:** [web overview](../overview.md) · **Related:** [architecture](../architecture.md), [web conventions](../web-conventions.md)

## Purpose

`UserAvatar` renders a fixed-size portrait for a Hive account: optional explicit image URL from API/feed, otherwise a default Hive CDN URL. Falls back to **initials** when there is no resolvable URL or the image fails to load (`onError`).

## Code locations

| Piece | Path |
|-------|------|
| Resolver (pure) | `apps/web/src/shared/presentation/avatar/resolve-avatar-url.ts` |
| Unit tests | `apps/web/src/shared/presentation/avatar/resolve-avatar-url.spec.ts` |
| Component | `apps/web/src/shared/presentation/avatar/user-avatar.tsx` |
| Barrel | `apps/web/src/shared/presentation/index.ts` exports `UserAvatar`, `resolveAvatarUrl`, types |

## Resolver rules (`resolveAvatarUrl`)

| Input | Result |
|-------|--------|
| `avatarUrl` non-empty | Trimmed string used as `src` (same as query-api / feed DTO). |
| No explicit URL | `https://images.hive.blog/u/{username}/avatar/small` if `size <= 64`, else `.../large`. |
| Empty `username` and no `avatarUrl` | `null` (initials-only fallback). |

No image proxy or guest-specific URL branches in this slice; see `tmp/avatar.md` for legacy parity notes.

## `UserAvatar` props

| Prop | Role |
|------|------|
| `username` | Hive name; used for default CDN path and initials fallback. |
| `avatarUrl` | Optional explicit URL (e.g. `UserProfileShellUser.avatarUrl` or `FeedStoryView.authorAvatarUrl`). |
| `size` | Pixel width/height. |
| `displayName` | Optional; initials and `alt` text. |
| `className` | Extra classes (e.g. `text-lg font-semibold` on profile). |
| `isSquare` | Square vs circular (`rounded-btn` vs `rounded-circle`). |

Uses plain `<img>` (MVP) to avoid `next/image` `remotePatterns` setup.

## Usage

- **Profile:** [`UserHeader`](../pages/user-profile/components/user-header.md) passes `user.avatarUrl`, `username`, `displayName`, `size` 96.
- **Feed row:** [`Story`](story-container.md) passes `story.authorAvatarUrl`, `authorName`, display label, `size` 40.

## Out of scope

- `AvatarLightbox` / click-to-enlarge (legacy).
- Full `getProxyImageURL` base58 pipeline from legacy `tmp/avatar.md` — add only if arbitrary external hosts must be normalized before display.

## Verification

`pnpm nx test web` (resolver tests) · `pnpm nx lint web`
