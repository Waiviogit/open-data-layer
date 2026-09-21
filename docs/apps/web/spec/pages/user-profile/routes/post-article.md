---
id: web-pages-user-profile-routes-post-article
title: Post article
description: Canonical public URLs use **`/@account/permlink`** (`next.config.js` rewrites them to `/user-profile/account/permlink` internally). Feed links use that form so the address bar matches the public scheme.
tags: [web, page, user-profile, post]
related:
  - docs/apps/web/spec/pages/user-profile/profile-shell.md
type: spec
status: active
scope: web
updated_at: 2026-06-10
---

# Post article: modal vs full page

**Back:** [overview.md](overview.md)

## URLs

Canonical public URLs use **`/@account/permlink`** (`next.config.js` rewrites them to `/user-profile/account/permlink` internally). Feed links use that form so the address bar matches the public scheme.

## Soft navigation (from any feed page)

`(app)/@modal/(...)user-profile/[name]/[permlink]/page.tsx` intercepts soft navigation from anywhere in the app. `(...)` matches from the app root, so the marker segment is the static string `(...)user-profile` — never a dynamic param. This avoids the Next 16 runtime bug where `(.)` applied directly to `[permlink]` caused path splitting on every `.` character in the permlink value.

`(app)/layout.tsx` renders both `{children}` (the current page) and `{modal}` (the intercepted post), so the previous page stays visible under the backdrop.

## Hard navigation (refresh, new tab, direct link)

`@modal/default.tsx` returns `null`; `(article)/[permlink]/page.tsx` renders the post full-page inside the narrow centered column from `(article)/layout.tsx` with no profile hero or rails.

## Content layout

`BlogPostScreen` accepts `variant="modal" | "page"`. The footer includes the same **`StoryVoteButton`** like control as feed cards (Hive `vote` op via wallet broadcast; see [feed.md](../../feed.md) “Likes”). **Linked objects** (tagged Waivio objects) appear **below** the HTML body in a collapsible section (`feed_linked_objects`), with one card per object: avatar, name, type · category labels, optional rating row, excerpt, and a heart indicator when the signed-in viewer has **favorited** that object (see query API).

## Single-post API (`X-Viewer`)

`getSinglePostQuery` calls `GET /query/v1/posts/:author/:permlink` with an optional **`X-Viewer`** header set to the current Hive account when the user is logged in. The query-api uses it to populate `isFavorited` on each object in `objects[]`, richer linked-object fields (`description`, `rating`, `categoryItems`), and **`votes.voted`** when the viewer has an active on-chain vote. Unauthenticated requests omit the header; favorite state, `voted`, and some fields fall back to defaults. The profile **posts** tab uses the same header on `POST /query/v1/users/:name/blog` so feed cards can show the voted state on the like control.

## Post body HTML

Server-side `sanitizePostHtml` (`apps/web/src/shared/infrastructure/sanitize-post-html.ts`) delegates to `sanitizePostBodyHtml` in `post-body-html-pipeline.ts` and prepares the body for `dangerouslySetInnerHTML`:

- **Markdown vs HTML:** `postBodyLooksLikeHtml()` decides the path. Trailing Peakd-style HTML footers (`<br/> <sub>…</sub>`) are stripped before detection. Bodies that start with markdown signals (`[![](…)]`, `# heading`, lists, …) stay on the **markdown** path even when a footer contains `<br>`.
- Otherwise, if the body already looks like HTML (block/inline tags such as `p`, `a`, `img`, …), it is **sanitized only** (no `marked`).
- Markdown bodies pass through **`marked`** (`gfm`, `breaks`), then embed transforms and sanitize.
- **Peakd 3Speak prefix:** markdown linked-image preview `[![](poster)](https://3speak.tv/watch?v=…)` and `▶ [Watch on 3Speak](…)` are stripped before markdown parse; the matching iframe is **prepended after** `marked` so headings and links in the body still render.
- **3Speak in HTML bodies:** linked poster `<a><img></a>`, `data-linked-url`, or bare watch URLs become `.blog-post-3speak-embed` iframes (`play.3speak.tv/…&mode=iframe&layout=desktop`). Video id capture excludes trailing `)` from markdown link syntax.
- Standalone **YouTube** watch / `youtu.be` / **shorts** URLs are replaced with an embed iframe inside `.blog-post-youtube-embed` (styles in `apps/web/src/app/global.css`).
- Standalone **Instagram** `/p/` `/reel/` `/tv/` URLs (not profile URLs) are replaced with `.blog-post-instagram-embed` iframes (`https://www.instagram.com/{p|reel|tv}/{code}/embed`). Detection lives in `media-embed.ts` and is shared with object Activity bodies.

Feed story cards still use `Story` for previews; full post views do **not** show a separate hero video above the body — video appears inline from the body content (or from the Peakd prefix preprocess).

## Related files

- Article page (hard nav): `apps/web/src/app/(app)/user-profile/[name]/(article)/[permlink]/page.tsx`
- Modal intercept: `apps/web/src/app/(app)/@modal/(...)user-profile/[name]/[permlink]/page.tsx`
- App layout (receives `modal` slot): `apps/web/src/app/(app)/layout.tsx`
- Shell: `apps/web/src/modules/feed/presentation/components/post-intercept-modal-shell.tsx`
