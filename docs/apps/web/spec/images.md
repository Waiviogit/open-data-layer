---
id: web-images
title: web — images and `next/image`
description: "Normative rules for raster images in `apps/web`: when to use Next.js `Image`, how to configure remotes, and what to avoid."
type: spec
status: active
scope: web
tags: [web, images]
updated_at: 2026-06-10
related:
  - docs/apps/web/spec/overview.md
---

# web — images and `next/image`

**Back:** [web overview](overview.md) · **Related:** [web conventions](web-conventions.md), [architecture](architecture.md)

Normative rules for raster images in `apps/web`: when to use Next.js [`Image`](https://nextjs.org/docs/app/api-reference/components/image), how to configure remotes, and what to avoid.

## Purpose

- **Performance:** responsive `srcset`, modern formats (WebP/AVIF where supported), lazy loading, and stable layout (CLS).
- **Consistency:** one pattern for user-facing photos (avatars, feed media, covers) and a different pattern for icons and rich text.

## Decision table

| Category | Use | Rationale |
|----------|-----|-----------|
| Feed thumbnails / post preview images | `next/image` (often `fill` in a sized container) | Largest visual payload; UGC aspect ratios vary — container defines layout |
| Avatars (user, tagged objects) | `next/image` with explicit `width` / `height` and `sizes` | Fixed display size; many instances per view |
| Profile / hero cover images | `next/image` with `fill`, `priority`, `sizes` | Above-the-fold; avoid delaying LCP |
| Small UI (icons, decorative graphics) | Inline SVG or static `<img>` | `Image` adds little value; SVG scales cleanly |
| Markdown or rich HTML body images (future) | Plain `<img>` with `loading="lazy"` | Arbitrary URLs and dimensions; integrating `Image` in markdown renderers is high cost |

## Configuration (`next.config.js`)

- **`images.remotePatterns`** — allowlisted hosts for the default image optimizer. The app loads **UGC** from many domains (thumbnails, covers, custom avatars). The config includes known CDNs and broad **HTTPS** and **HTTP** patterns (`hostname: '**'`) so arbitrary public hosts work, including legacy **`http://`** URLs (e.g. older imgur links).
- **`images.minimumCacheTTL`** — set to **86400** (24h) to reduce repeated optimization work for stable UGC URLs.
- **Adding hosts:** prefer documenting new first-party or CDN hosts in this file when they become common; the broad pattern is a pragmatic default, not a security boundary for private data.

## Hive `0x0` image proxy (UGC)

Dead or flaky UGC hosts (e.g. legacy **`ipfs.busy.org`**) break feed previews and post body `<img>` tags. At **display** time, wrap remote URLs with Hive’s CDN (legacy Waivio `getProxyImageURL` / `getImagePathPost`):

`https://images.hive.blog/0x0/{originalUrl}`

| Helper | Path |
|--------|------|
| `getProxyImageUrl` / `getImagePathPost` / `stripHiveImageProxyPrefix` / `normalizeLegacyObjectImageUrl` / `resolveObjectImageUrl` / `getPreviewProxyImageUrl` | `apps/web/src/shared/infrastructure/image/get-proxy-image-url.ts` (also re-exported from `@/shared/presentation`) |
| `ObjectThumbnail` | `apps/web/src/shared/presentation/components/object-thumbnail.tsx` — object page hero, feed chips, `ObjectCard`, ref rows |

**Skip proxy** when the URL contains: `waivio.nyc3.digitaloceanspaces` / `nyc3.digitaloceanspaces`, `steemitimages.com`, `i.imgur.com`, `sephora.com`, `.avif`, `gstatic.com` (Google Shopping thumbnails — Hive returns 403), `ecency.com` (Ecency CDN thumbs — double-proxy distorts), `/ipfs-gateway/content/image/` (first-party IPFS content gateway — Hive returns 403), or video poster CDNs (`vumbnail.com`, `i.ytimg.com`, `img.youtube.com` — Hive returns 403). Hive **avatar** paths (`images.hive.blog/u/…`) are left unchanged. Relative `/…` and `data:` URLs are left unchanged.

**Legacy `steemitimages.com` object avatars:** stored URLs like `https://steemitimages.com/u/{user}/avatar/large` must not be wrapped in `0x0/` (403). `normalizeLegacyObjectImageUrl` rewrites them to `https://images.hive.blog/u/{user}/avatar/{large|small}` before display.

**Already on `images.hive.blog/{W}x{H}/…` or `/p/…`:** some stored thumbs (e.g. `1280x0/https://ipfs.busy.org/…`) 400 alone but work when wrapped again as `0x0/{fullHiveUrl}`. Direct Hive assets (`/DQm…`, `/u/…` avatars) and standard `0x0/{external}` are left as-is.

**Applied at display (not in query-api payloads):** feed card / grid preview `Image` src, explicit avatar URLs (`resolveAvatarUrl`), **object thumbnails** (`ObjectThumbnail`), **object gallery** (`GalleryImage`), post/comment body and feed excerpt HTML (`transformTags.img`, optional `data-fallback-src`), SEO OG / Article JSON-LD remote thumbs. Canonical `thumbnailUrl` from the API stays unproxied so excerpt omit-matching still works.

**Object images (raw-first):** `ObjectThumbnail`, `GalleryImage`, and object hero cover (`ObjectHeroCoverImage`) load the **normalized canonical URL first**, then fall back to Hive `0x0` proxy, then legacy preview proxy, then placeholder / failed state. This avoids Hive 403 on modern CDNs (x.ai, Shopify, first-party IPFS gateway) without maintaining a growing skip-list. Legacy dead hosts (e.g. `ipfs.busy.org`) still recover via Hive cache after the direct URL fails.

Base58 Hive `800x600/p/…` preview mode is **not** the default for feed/body (those use `0x0/`). **`ObjectThumbnail`** / **`GalleryImage`**: raw canonical URL → Hive `0x0` on error → `getPreviewProxyImageUrl` on error → `AVATAR_PLACEHOLDER_SRC` / failed state.

## `sizes` and layout

- **Fixed-size avatars:** `sizes={`${size}px`}` or `sizes="36px"` when width/height match the rendered box.
- **Feed preview:** responsive `sizes` reflecting the feed column (e.g. `(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw`). Adjust if layout breakpoints change.
- **Cover / hero:** `sizes="100vw"` when the image spans the viewport width of its region.

Use **`fill`** when the visual box is defined by a parent (`relative` + height/aspect); use **explicit `width` / `height`** when the asset renders at a fixed pixel size.

- **Flex parents:** In a row flex, default `align-items: stretch` can stretch a fixed-size avatar vertically. `UserAvatar` uses **`self-start`**, **`shrink-0`**, and inline **`width` / `height` / `minWidth` / `minHeight`** so the box stays square (same idea as a plain `<img>` with explicit pixel dimensions).

### Object gallery — showcase vs thumbnails

| Surface | Aspect frame | `object-fit` | Notes |
|---------|--------------|--------------|-------|
| Description checkerboard photos (`ObjectDescriptionPhotoButton`) | Natural (portrait uncapped; landscape capped 16:9) | `contain` | Square skeleton until load; image hidden until aspect known |
| Left-rail carousel (`ObjectGalleryCarousel`) | Same as above via `resolveContentImageFrameAspect` | `contain` | Cached aspect per URL; square skeleton on first load |
| Gallery tab grid, `ObjectCard`, hero avatar | Square or 4:3 fixed | `cover` | Compact thumbnails — intentional crop |
| Full-screen gallery viewer | Flexible | `contain` | No crop |

Inline `<img>` in object page / description HTML uses **`h-auto max-w-full`** (see `OBJECT_PAGE_CONTENT_BODY_CLASS`).

## `priority`

- Use **`priority`** only for **above-the-fold** images that matter for LCP (e.g. profile cover on the profile page).
- Do **not** set `priority` on every feed row — that disables lazy loading and hurts performance.

## Fallback and errors

- For components that swap to a placeholder when loading fails (e.g. `UserAvatar`), keep **`onError`** + React state: on error, render the placeholder `Image` (or branch) instead of the remote URL.
- **`ObjectThumbnail`** (object page hero, feed tagged-object chips, `ObjectCard`, ref rows): **raw canonical URL** first → on error Hive `0x0` proxy → on error legacy preview `getPreviewProxyImageUrl` → on error `AVATAR_PLACEHOLDER_SRC`. Use this instead of ad-hoc `Image` + raw `fields.image`.
- **`GalleryImage`** (object gallery carousel, tab grid, viewer, description photo blocks): **raw canonical URL** first → on error Hive `0x0` proxy → on error `getPreviewProxyImageUrl` → on error styled failed state. Always **`unoptimized`**. Do not pass raw gallery URLs to `next/image` in callers — fallback logic lives in `GalleryImage` only.
- **`ObjectHeroCoverImage`** (object page hero background): same raw → Hive `0x0` chain; hides cover on terminal failure.
- Some hosts (e.g. **`img.3speakcontent.co`**, **`steemitimages.com`**) can fail the optimizer’s **server-side** `fetch` (DNS / network / 403 via proxy). Use **`shouldUnoptimizeRemoteImage(src)`** from `@/shared/presentation` and pass **`unoptimized`** to `Image` for those URLs so the browser loads the asset directly; pair with **`onError`** where a visible fallback is needed (e.g. feed preview media, `ObjectThumbnail`).

## Markdown content

When post bodies are rendered as Markdown/HTML, use normal **`<img>`** tags with **`loading="lazy"`** unless there is a dedicated pipeline that supplies dimensions and a single remote policy. Do not block Markdown on the default image optimizer. Body/excerpt pipelines rewrite remote `img` `src` through the [Hive `0x0` image proxy](#hive-0x0-image-proxy-ugc) before render.

## IPFS object images (CID)

Object `image` / `imageBackground` / gallery fields may store `{ cid }` (upload via ipfs-gateway). Display URLs are built as:

`{IPFS_CONTENT_BASE_URL}/ipfs-gateway/content/image/{cid}`

These URLs are **not** wrapped in the Hive `0x0` proxy at display time (see skip-proxy list above).

| Variable | Service | When read |
|----------|---------|-----------|
| `IPFS_CONTENT_BASE_URL` | query-api, web | **Runtime** (container / `nx serve` env) — same value on a stack; web server actions use it for uploads via nginx |

Runtime configuration only — see [web conventions — Env config](web-conventions.md#runtime-vs-build-ghcr--compose). The root layout reads `IPFS_CONTENT_BASE_URL` and passes it to client UI via `IpfsContentBaseProvider` / `useIpfsContentBaseUrl()`.

Upload (`POST /ipfs-gateway/upload/image`, `/upload/file`) is proxied at **`/ipfs-gateway/`** through nginx and requires **`Authorization: Bearer`** (access JWT, same `JWT_SECRET` as auth-api). Server actions read `odl_access` and forward the token. **`/upload/image`** max **50 MiB**; **`/upload/file`** max **16 MiB** (ODL JSON envelopes for `batch_import`).

**Code:** `get-ipfs-content-base-url.ts`, `get-ipfs-gateway-server-base-url.ts`, `get-bearer-access-token.server.ts`, `upload-image.action.ts`.

### Client-side image editor (before upload)

For `image` (avatar), `imageBackground`, and `imageGalleryItem` fields, picking a file or pasting a URL opens an **inline editor** in `ImageCidOrUrlForm` before IPFS upload:

| Update type | Crop aspect | Max export |
|-------------|-------------|------------|
| `image` | **1:1** (square avatar) | 1024 px |
| `imageBackground` | Natural / free | 1920 px |
| `imageGalleryItem` | Natural / free | 1920 px |

Tools: zoom, fit (reset framing), rotate (+90°), mirror (horizontal). Letterboxing uses a neutral background when the image does not fill the crop frame (e.g. book covers). **Save** exports WebP client-side, then uploads via the existing `upload-image.action.ts` flow. Stored value remains `{ cid }` only.

**Code:** `shared/presentation/components/image-editor/`, `image-editor-config.ts`, `image-cid-or-url-form.tsx`.

## Verification

| Command | Purpose |
|---------|---------|
| `pnpm nx lint web` | ESLint |
| `pnpm nx build web` | Ensures `Image` src domains match `remotePatterns` |
