# Feed (story list)

**Related:** [Story container](components/story-container.md), [auth](auth.md), [architecture](architecture.md).

## Story cards

Feed rows render `Story` (via `StoryContainer`) with stats, overflow menu, and optional media.

## Comment editor (logged-in)

When the viewer is logged in (`currentUsername` set), each story card shows **`StoryCommentEditor`** below the footer (`apps/web/src/modules/feed/presentation/components/story-comment-editor.tsx`).

- Uses **`LexicalPostEditor`** from `@/modules/editor` (compact layout) — same Lexical surface as the main post editor, without title or draft autosave.
- Submit builds a Hive **`comment`** operation (`buildCommentOp`) and broadcasts via **`getWalletFacade().broadcast`** (`@/modules/auth`).
- After a full page reload, **`useHydrateWalletProvider`** restores Keychain as the active wallet provider from `sessionStorage` (set on Keychain login) so broadcast works without signing in again.
