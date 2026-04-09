# Editor drafts sidebar and autosave

**Back:** [overview](overview.md)

## Routes

| Path | Description |
|------|-------------|
| `/editor` | Compose post; optional query `?draftId=` or `?permlink=` (and legacy `?author=` must match session user). |
| `/drafts` | List all drafts with selection and bulk delete. |

## Data flow

- **query-api** (`/query/v1/users/:author/drafts`): list, create, patch, single delete, and **`POST .../drafts/bulk-delete`** with `{ draftIds: string[] }`. See [user-post-drafts-endpoint.md](../../query-api/spec/user-post-drafts-endpoint.md).
- **Web** calls the API from **server actions** in `apps/web/src/modules/editor/infrastructure/drafts.actions.ts` using the httpOnly access cookie as `Authorization: Bearer`.
- **Initial draft load** (SSR): `fetchUserPostDraftForEditor` in `fetch-user-post-draft.server.ts` returns `draftId`, `title`, `body`, `permlink`, `lastUpdated` when opening by `draftId` or `permlink`.
- **Sidebar “Last drafts”**: first paint uses `fetchUserDraftListServer` with `limit: 5` on the editor page; list refreshes after successful save via `router.refresh()`.

## Hydration

- Sidebar and drafts list use **`HydrationSafeRelativeTime`** so “time ago” strings are not computed during SSR (avoids server/client clock skew). Navigational **`Link`**s use **`suppressHydrationWarning`** where browser extensions may alter `<a>` attributes.

## Autosave

- **Debounce:** 3 seconds after the last change to title or body (Lexical plain text via `$getRoot().getTextContent()`).
- **Create vs patch:** If there is no `draftId`, the first save that has non-empty title or body runs **POST** create, then `router.replace` to `?draftId=…`. Otherwise **PATCH** with `draftId`.
- **Flush:** On `pagehide`, `visibilitychange` to `hidden`, and component unmount, pending debounced work is cancelled and a final save runs if content differs from the last persisted snapshot.

## `/drafts` page

- Loads pages of 20 drafts with cursor pagination (“Load more”).
- Master checkbox + per-row checkboxes; **Delete selected** and per-row **Delete** use `bulk-delete` (same API for a single id).
