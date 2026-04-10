# Feed (story list)

**Related:** [Story container](components/story-container.md), [auth](auth.md), [architecture](architecture.md).

## Story cards

Feed rows render `Story` (via `StoryContainer`) with stats, overflow menu, and optional media.

## Comment editor (logged-in)

When the viewer is logged in (`currentUsername` set), each story card shows **`StoryCommentEditor`** below the footer (`apps/web/src/modules/feed/presentation/components/story-comment-editor.tsx`).

- Uses **`LexicalPostEditor`** from `@/modules/editor` (compact layout) — same Lexical surface as the main post editor, without title or draft autosave.
- Submit builds a Hive **`comment`** operation (`buildCommentOp`) and broadcasts via **`getWalletFacade().broadcast`** (`@/modules/auth`).
- After a full page reload, **`useHydrateWalletProvider`** restores Keychain as the active wallet provider from `sessionStorage` (set on Keychain login) so broadcast works without signing in again.

## Likes (Hive vote)

The like control is **`StoryVoteButton`** (`story-vote-button.tsx`), used on feed **`Story`** rows and on full post **`BlogPostScreen`** (see [post-article.md](post-article.md)).

- **Broadcast:** `buildVoteOp` + **`getWalletFacade().broadcast`**, with **`useHydrateWalletProvider`** (same wallet session pattern as comments).
- **Default weights:** `HIVE_VOTE_WEIGHT_FULL` (10000) vs `HIVE_VOTE_WEIGHT_CLEAR` (0) via **`defaultResolveVoteWeight`** in [`domain/vote-weight.ts`](../../../../apps/web/src/modules/feed/domain/vote-weight.ts). Extend behavior with **`VoteWeightContext`** and an optional **`resolveVoteWeight`** prop on `StoryVoteButton` (e.g. future slider / custom %).
- **UI:** Optimistic count toggle on success; guests see a disabled control. Server counts refresh on the next navigation or refetch (no `router.refresh` in v1).
