# Object page — Gallery tab

**Back:** [web overview](../overview.md) · **Related:** [navigation.md](navigation.md), [object-edit.md](../object-edit.md)

## Scope

Center-column Gallery tab at `/object/:id/gallery` and album drill-down at `/object/:id/gallery/album/:album_name`. Data comes from query-api `galleryAlbums` on object resolve; UI supports album grid, Related stub, album photo grid, and add-album / add-image modals.

---

## URLs

| Visible URL | Center column |
|---|---|
| `/object/:id/gallery` | Album cards grid + static **Related (0)** stub |
| `/object/:id/gallery/album/:name` | Single album photo grid (`:name` is `encodeURIComponent` of album name) |

Proxy (`apps/web/src/proxy.ts`) rewrites album paths **before** plain `/gallery`:

```
/object/:id/gallery/album/:album → /object/:id?tab=gallery&gallery_album=:album
/object/:id/gallery             → /object/:id?tab=gallery
```

Client navigation uses `buildObjectGalleryPath` / `buildObjectGalleryAlbumPath` in `object-page-url.constants.ts`. Active album sync: `resolveGalleryAlbumForObjectPage` (pathname preferred, then `?gallery_album=`).

---

## Data

| Field | Source | Web mapping |
|---|---|---|
| `galleryAlbums` | query-api resolve (`build-gallery-albums.ts`) | `ObjectPageViewModel.galleryAlbums` via `projectedGalleryAlbums()` |
| Album shape | `{ name, items: ProjectedGalleryPhoto[] }` | `ProjectedGalleryAlbumView` |

Zod: `projectedObjectViewSchema.galleryAlbums` in `feed-story.dto.ts`.

---

## UI (`ObjectGalleryTabContent`)

**Albums list** (`activeAlbumName === null`):

- Toolbar: **Add new album** (always visible; guests → sign-in modal).
- Grid of album cards: cover = first item URL or placeholder; label `{name} ({count})`.
- **Related (0)** — non-clickable stub (not from API).

**Album detail** (`activeAlbumName` set):

- Toolbar: **Back to albums** (left), **Add new image** (right).
- Header: album name.
- 2-column square photo grid (`object-cover`).
- Empty album: `gallery_list_empty`.
- Unknown album name: empty state + back link.

Wired from `ObjectPrimaryContent` when `activePrimarySegment === 'gallery'`.

---

## Add modals

Uses `AddUpdateModal` (`mode: 'generic'`):

| Action | `updateType` | `initialValue` |
|---|---|---|
| Add album | `imageGallery` | `''` (album name text) |
| Add image (in album) | `imageGalleryItem` | `{ album, url: '', cid: '' }` with `lockGalleryAlbum: true` |

Forms: text field for `imageGallery` (placeholder `add_new_album_placeholder`); `ImageGalleryItemForm` for `imageGalleryItem` (album read-only in album view, URL or CID). After broadcast: `revalidateObjectAfterBroadcast` + router refresh (modal default).

Guests clicking Add → `onRequireLogin()` (same as other object-page actions).

---

## Out of scope (v1)

- Related album with real post photos
- Lightbox / full-screen viewer
- Drag-and-drop multi-upload
- Hiding Gallery tab when no albums exist
