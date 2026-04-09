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

`BlogPostScreen` accepts `variant="modal" | "page"`. Tagged objects appear **below** the HTML body (section title `feed_post_tagged_objects`), then NSFW notice if any, then the stats footer (votes, comments, payout, overflow).

## Related files

- Article page (hard nav): `apps/web/src/app/(app)/user-profile/[name]/(article)/[permlink]/page.tsx`
- Modal intercept: `apps/web/src/app/(app)/@modal/(...)user-profile/[name]/[permlink]/page.tsx`
- App layout (receives `modal` slot): `apps/web/src/app/(app)/layout.tsx`
- Shell: `apps/web/src/modules/feed/presentation/components/post-intercept-modal-shell.tsx`
