# Post editor (`/editor`)

**Back:** [web overview](overview.md) · **Related:** [architecture](architecture.md), [auth](auth.md), [app-header](app-header.md)

## Purpose

Authenticated screen for composing a post: title field and rich body using **Lexical** (`lexical`, `@lexical/react`, `@lexical/rich-text`, `@lexical/list`, `@lexical/link`). Legacy Waivio behavior (draft list, campaigns, linked objects, Slate) is described in [`tmp/editor-page.md`](../../../../tmp/editor-page.md) and is **not** implemented in the MVP; extend with application queries and server actions when APIs exist.

## Route and access

| Item | Detail |
|------|--------|
| Path | `/editor` — [`apps/web/src/app/(app)/editor/page.tsx`](../../../../apps/web/src/app/(app)/editor/page.tsx) |
| Auth | Server Component calls `createCookieAuthContextProvider().getUser()`; if `null`, `redirect('/')`. Unauthenticated users cannot view the editor. |
| Entry | Logged-in **write** icon in [`LoggedInHeaderActions`](../../../../apps/web/src/modules/app-header/presentation/components/logged-in-header-actions.tsx) → `/editor`. |

## Implementation

| Area | Detail |
|------|--------|
| Module | [`apps/web/src/modules/editor/`](../../../../apps/web/src/modules/editor/) — presentation-only MVP (`EditorScreen`, `LexicalPostEditor`, `EditorInsertMenuShell`). |
| Layout | Main column uses **`max-w-container-content`** (not `container-narrow`). |
| UI | Design tokens (see [theme.md](theme.md)); body placeholder uses i18n `story_placeholder`; page title from `editor` in `generateMetadata`. |
| Insert menu | **+** is outline-only (`bg-bg`, border), centered on the **left border** (`-translate-x-1/2`), and **tracks the caret line** (collapsed-range safe geometry via `getCaretLineViewportRect`, double `requestAnimationFrame` after Lexical updates, `selectionchange`, `keyup`/`input`/`click` on root). Opens a dialog (title + grid + search; no header close button). Actions disabled until Lexical/node wiring; search is UI-only. i18n: `editor_insert_*`, `editor_search_object_by_name`. |
| i18n | Document title uses locale messages via `getRequestLocale` + `loadMessages`. |

## MVP limits

- No persistence (drafts), publish, preview, or Hive broadcast.
- No query params (`draft`, `campaign`, `permlink`) yet.
- Insert grid items do not insert content yet (placeholders).

## Verification

Open `/editor` logged out → redirect to `/`. Logged in → editor UI; header write icon navigates to `/editor`.
