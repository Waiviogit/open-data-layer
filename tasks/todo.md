# Activity Instagram/YouTube embeds

## Checklist

- [x] `media-embed.ts` — parse Instagram p/reel/tv + YouTube watch/shorts/youtu.be
- [x] Wire `embedMediaUrls` into `sanitizePostBodyHtml`; allow instagram.com iframes; CSS
- [x] Enable editor Insert Video URL panel
- [x] Tests + post-article / messaging / editor docs
- [x] `pnpm nx test web --testPathPatterns="media-embed|post-body-html-pipeline|insert-editor-media-url"`
- [x] `pnpm typecheck:web`
- [x] `pnpm check:web-i18n-utf8`

## Review

**Changes:** Shared `parseMediaEmbedUrl` turns Instagram `/p|/reel|/tv` and YouTube (watch, youtu.be, shorts) URLs into iframes inside `sanitizePostBodyHtml`. Object Activity already used that pipeline, so WHITE GARDEN-style bodies (text + IG URL) now render a player. Insert → Video is enabled: paste URL, store as markdown link.

**Verification:**
- 28 tests pass (`media-embed`, `post-body-html-pipeline`, `insert-editor-media-url`)
- `pnpm typecheck:web` pass
- locale UTF-8 check pass
- Browser Activity page not exercised (dev server not running)

**Follow-up:** TikTok / Vimeo URL→iframe still out of scope. Instagram iframe may show a login wall when logged out of IG.
