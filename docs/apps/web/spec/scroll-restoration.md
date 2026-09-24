---
id: web-scroll-restoration
title: web — scroll position on navigation
description: How list scroll is remembered per history entry and how a detail page opens at the top.
type: spec
status: active
scope: web
tags: [web, navigation, scroll]
updated_at: 2026-09-24
related:
  - docs/apps/web/spec/overview.md
  - docs/apps/web/spec/pages/object/navigation.md
  - apps/web/AGENTS.md
---

# web — scroll position on navigation

**Back:** [web overview](overview.md) · **Related:** [object navigation](pages/object/navigation.md)

Next.js 16 does not scroll to the top on client navigations in this app (`scrollRef` stays unset, so the layout-router scroll handler never runs). Opening a shorter page from a scrolled list therefore paints at a clamped offset. Back does not restore the list either: Next skips scroll intent on history traversal, and client feeds such as Discover remount with only the first page.

## Fresh open of a detail route

The list is not scrolled on click. `ScrollToTopOnEnter` (`routeKey` = entity id) runs `scrollToTopNow()` inside `useLayoutEffect`, before paint of the object page. `scroll-behavior` is set to `auto` for that call because `html` uses smooth scrolling. Tab changes keep the same key and do not reset.

While `isScrollRestorePending()` is true the component does nothing, so back/forward is not overwritten.

## List offset on back/forward

`ScrollMemoryListener` is mounted once from `(app)/layout.tsx`. It sets `history.scrollRestoration = 'manual'` so the browser does not overwrite the offset this module restores.

1. Capture-phase click on a same-origin `<a>` (plain left click, no `target`, no `download`) calls `rememberScrollForCurrentEntry()`, which `replaceState`s `history.state.__odlScrollY` onto the **current** entry and keeps Next's `__NA` fields.
2. `navigateInstant({ method: 'push' })` does the same before `pushInstantUrl`. `pushInstantUrl` copies history state **without** `__odlScrollY`, so the new entry does not inherit the list offset.
3. On `popstate`, if the entry has a saved offset, `beginScrollRestore` loops on `requestAnimationFrame` (cap 8s, so a list RSC that takes a couple of seconds still mounts while the restore is pending). It scrolls once `documentElement.scrollHeight >= y + innerHeight` and the window actually lands on that offset — a clamped scroll while the list is still short does not finish the restore. `wheel`, `touchstart`, and `keydown` abort it.

## Client-fetched lists

A list that clears its rows on mount must be able to rebuild the scrolled content. Discover writes loaded pages to `discover-feed-cache` (last 3 queries) and seeds from that cache only when a restore is pending. A normal forward visit still refetches.

## Do not

- Scroll from a route layout on `requestAnimationFrame` or `setTimeout`. The page has already painted at the old offset.
- Track "this was a back navigation" with a flag cleared on a microtask. The detail layout mounts long after `popstate`.
---
