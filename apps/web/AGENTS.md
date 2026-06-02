# web — agent rules

Specialization for this app. **Shared policy** (monorepo, docs standards, cross-cutting Nx) lives in the repo root [`AGENTS.md`](../../AGENTS.md). Web architecture and conventions are also documented under [`docs/apps/web/`](../../docs/apps/web/). This file is the **operational** checklist for `apps/web`.

## Stack

- **Next.js App Router** (`src/app/`) — not NestJS.

## Environment variables (runtime, not build)

**Deployment-specific configuration is not baked into the web Docker image at build.** Staging, production, and custom hosts each set their own values in compose `.env` / `env_file` at container start. Operators can substitute URLs, secrets, and feature flags without rebuilding the image.

| Do | Don't |
|----|--------|
| Read deploy-specific vars on the **server** (`src/config/env.ts`, `get-*.ts` with `server-only`) | Put stack URLs or origins in **Docker build-args** or **`NEXT_PUBLIC_*`** so they are frozen at `next build` |
| Pass values into **Client Components** via root **layout providers** or server props | Read `process.env.NEXT_PUBLIC_*` in client code for per-deployment URLs (API bases, WS, IPFS content base, `ODL_NETWORK`, …) |
| Document new keys in `apps/web/.env.example` and root `.env.example` | Scatter raw `process.env` across `modules/` |

**Existing providers (copy this pattern):** `OdlNetworkProvider` (`ODL_NETWORK`), `NotificationsWsConfigProvider` (`NOTIFICATIONS_WS_PUBLIC_URL` via `getNotificationsWsPublicUrl()`), `IpfsContentBaseProvider` (`IPFS_CONTENT_BASE_URL` via `getIpfsContentBaseUrl()`).

Full rules: [`docs/apps/web/spec/web-conventions.md`](../../docs/apps/web/spec/web-conventions.md#env-config).

## Route groups and layouts

```
app/
  layout.tsx              Root: lang, dir, data-theme, data-shell-mode; ThemeProvider, ShellModeProvider, I18nProvider
  (app)/layout.tsx        App shell (header, nav, modals)
  (public)/layout.tsx     Public shell
  (immersive)/layout.tsx  Immersive shell
  api/                    BFF routes (auth challenge/verify/refresh/logout, callbacks)
```

- **Do not** add `'use client'` to root or segment **layout** files unless there is an exceptional, documented reason.

## Feature modules (`src/modules/<feature>/`)

Prefer clean-architecture layers:

```
domain/          types, ports, pure logic
application/     queries/, use-cases/, mappers/, dto/
infrastructure/  clients/, repositories/ (port implementations), providers/
presentation/    components/, hooks/
index.ts         public barrel — other features import only from here
```

- Full layering rules: [`docs/apps/web/spec/architecture.md`](../../docs/apps/web/spec/architecture.md) and [`docs/apps/web/spec/web-conventions.md`](../../docs/apps/web/spec/web-conventions.md).

## i18n (custom — not `next-intl`)

- Message catalogs: `src/i18n/locales/*.json`. **Strict UTF-8, no BOM**, valid JSON — enforced in CI (`verify.yml` → `scripts/verify-web-locale-json-utf8.cjs`); local: `pnpm check:web-i18n-utf8`.
- Scripts/agents that edit catalogs: **explicit UTF-8** on every read/write (Python `encoding='utf-8'`; Node **Buffer** + `TextDecoder('utf-8', { fatal: true })`). See repo root [`AGENTS.md`](../../AGENTS.md) **Web i18n locale catalogs**.
- Server: **`getRequestLocale()`** (cookies + `Accept-Language`), **`loadMessages()`** for the active catalog.
- Client: **`I18nProvider`** and **`useI18n()`** for `t(key)` lookups.
- Locale is **not** a URL segment — do **not** introduce `[locale]` segment routing.
- RTL: use **`isRtl(locale)`** from `src/i18n/domain/`; set **`dir`** on `<html>` in the root layout only.
- New locale: add JSON under `i18n/locales/` and register the locale in `i18n/config/locales.ts`.

## Design tokens

- Source of truth: **`src/styles/theme.css`** (`[data-theme='…']` CSS variables), extended in **`tailwind.config.js`**. Full token table: [`docs/apps/web/spec/theme.md`](../../docs/apps/web/spec/theme.md).
- Use **semantic** Tailwind utilities mapped to those variables in `className`, `@apply`, and component CSS — not Tailwind’s default scale or raw CSS literals (except documented exceptions below).
- New token role: update **`theme.css`** for every theme block, **`tailwind.config.js`**, and **`docs/apps/web/spec/theme.md`** in the same change.

### Colors

| Do | Don't |
|----|--------|
| `bg-bg`, `text-fg`, `border-border`, `text-link`, `bg-accent`, … | Raw `#…`, `rgb()`, `rgba()`, `hsl()` in `className` or inline `style` |

### Typography

| Do | Don't |
|----|--------|
| `text-body`, `text-body-sm`, `text-caption`, `text-section`, `text-display`, … | Tailwind defaults: `text-sm`, `text-lg`, `text-xl`, `text-2xl`, `text-[14px]`, … |
| `font-body`, `font-display`, `font-editorial`, `font-mono`, `font-label` | `font-sans`, `font-serif`, inline `font-family`, named stacks in components |
| `font-weight-body`, `font-weight-label`, `font-weight-strong`, `font-weight-display` | `font-normal`, `font-medium`, `font-semibold`, `font-bold` |
| `leading-body`, `leading-editorial`, `leading-display`, `leading-compressed` | `leading-tight`, `leading-snug`, `leading-relaxed`, magic line-height numbers |
| `tracking-body`, `tracking-caption`, `tracking-loose`, `tracking-display` | `tracking-wide`, `tracking-tighter`, arbitrary `tracking-[…]` |

Body copy inherits `var(--font-body)` from `global.css`; still set **`font-body`** (or **`font-display`** / **`font-editorial`**) when a block must use a different stack (headlines, article prose, code).

### Radius, elevation, layout

| Do | Don't |
|----|--------|
| `rounded-btn`, `rounded-card`, `rounded-pill`, `shadow-card`, `shadow-ring`, … | `rounded-md`, `rounded-lg`, `shadow-sm`, `shadow-lg`, ad-hoc `box-shadow` |
| `px-gutter`, `py-section-y`, `p-card-padding`, `max-w-container-content`, shell `*-shell-*` spacing | Raw `px-4`, `py-16`, `max-w-lg` when a layout token exists for the same role |

In plain CSS (e.g. Leaflet overrides), prefer **`var(--font-size-body)`**, **`var(--font-mono)`**, **`var(--radius-btn)`** over pixel literals.

### Documented exceptions

- **Hero/gallery chrome on photography** — use `.hero-on-photo-*` and `.gallery-*` classes in [`global.css`](src/app/global.css) only; do not scatter inline `text-white`, `bg-white/…`, or rgba `text-shadow` in components.
- **Third-party embed CSS** (Leaflet, sanitized post HTML) may use minimal literals when no hook exists; still prefer theme `var(--*)` where you control the stylesheet.
- **Video letterbox / iframe backgrounds** — `bg-black` on YouTube embeds and inline video iframes (`.blog-post-youtube-embed`, feed story video) is allowed.
- **External brand mimicry** (e.g. Facebook Open Graph preview in object create) may keep platform-specific hex colors, `rounded-md`/`rounded-lg`, and shadow literals on the mimic surface only.
- **Dropdown / media sizing** — arbitrary `min-w-[…]`, `max-h-[…]`, `aspect-[…]` when no layout token exists for that control.
- **Icon alignment** — `leading-none` on star ratings, carousel arrows, and similar non-text glyphs.

## Theme runtime

- **`src/theme/`** owns server resolution, cookies, and client `ThemeProvider`; set **`data-theme`** on `<html>` from here only. Do not read/write theme preference ad hoc outside this module.

## Shell mode

- **`data-shell-mode`** on `<html>` is set server-side.
- Use helpers from **`shell-mode-features.ts`** (`shouldHideHero`, `shouldUsePostGrid`, `getVisibleMenuKeys`, etc.) — **avoid** raw `resolvedMode === '…'` checks in feature components.
- Imports: **`@/shell-mode`** barrel only (see root AGENTS.md).
- New shell behavior: add a helper in **`shell-mode-features.ts`** and, if needed, CSS hooks in **`theme.css`** — not scattered string comparisons.

## Images

- **`next/image`** for user-facing raster (avatars, feed thumbnails, covers).
- Inline SVG or **`<img>`** for icons and decorative graphics.
- Markdown/HTML body images may use **`<img loading="lazy">`**.
- **IPFS CID previews:** **`useIpfsContentBaseUrl()`** — see [Environment variables (runtime, not build)](#environment-variables-runtime-not-build) and [`images.md`](../../docs/apps/web/spec/images.md#ipfs-object-images-cid).

## Object cards (`ObjectCard`)

**One component for every object card in the UI** — do not add parallel card implementations per screen.

| Canonical | Import |
|-----------|--------|
| **`ObjectCard`** | `@/modules/feed/presentation` (barrel) |
| Card excerpt helper | `truncateObjectCardDescription` from `@/modules/feed/application/dto/object-card-description` (300 chars + `…`) |

**Use `ObjectCard` for:** discover feed, user shop/recipe lists, post linked objects, object page menu catalog rows, and any future surface that shows a compact object preview (thumbnail, title, type · tags, ratings, description excerpt, admin heart).

**Do not:**

- Copy-paste card markup into feature modules (e.g. inline `ListItemCard`, bespoke `<article>` layouts).
- Reimplement description truncation, rating grid, or navigation (avatar + title only) outside `ObjectCard`.
- Add a second “object card” component when the layout is “close enough” — extend **`ObjectCard` props** instead (e.g. `linkReplace`, `onNavigateInColumn` if in-column navigation is needed).

**Data shape:** `ObjectCard` expects **`ProjectedObjectView`** (`@/modules/feed/application/dto/object-fields`). Map list/API DTOs at the boundary with **`projectedListItemToObjectView`** (`@/modules/object/application/mappers/projected-list-item-to-object-view`) — do not fork the card because the source type differs.

**In-column catalog nav:** pass **`onNavigate`** to `ObjectCard` (object page menu); omit for normal object-page links. List-type folder rows use **`ListCatalogRow`** in `object-list-content.tsx` only — not an object preview card.

**Tests:** component tests in `object-card.spec.tsx`; Playwright smoke in `apps/web-e2e/src/object-card-navigation.spec.ts` (mocked API, no DB).


- Server HTML for a Client Component’s first paint must **match** the client’s initial render.
- Avoid in the initial render of hydrated subtrees: `Date.now()`, `Math.random()`, locale/time formatting that differs SSR vs client, `typeof window` branching.
- Use **`useEffect`**, server-passed props, or small helpers (e.g. hydration-safe relative time) for client-only values.
- **`suppressHydrationWarning`** on **`next/link`** is only for known third-party DOM attribute injection (e.g. password managers), not to mask application bugs.

## Server vs client components

- Default to **Server Components**.
- Add **`'use client'`** only when hooks, events, or browser APIs require it.
- Pass server-fetched data as **props**; avoid **`useEffect`** solely to load initial data.

## API routes (`app/api/`)

- BFF / auth plumbing only — **delegate** to `src/shared/infrastructure/auth/` (and related helpers). No business rules in route handlers.

## SEO and metadata

Cross-cutting SEO lives in **`src/seo/`** (parallel to `src/i18n/` and `src/theme/`). Import via **`@/seo`** barrel only. Module layout: [`docs/apps/web/spec/architecture.md`](../../docs/apps/web/spec/architecture.md).

```
src/seo/
  domain/          metadata contracts, JSON-LD builders for post/profile (pure)
  application/     buildPageMetadata({ route, model, locale, messages }) use-cases
  infrastructure/  publicOrigin / buildPublicUrl helpers, API → OG mappers
  presentation/    JsonLdScript (server component)
  index.ts         public barrel — @/seo
```

Route files keep **`export async function generateMetadata`** (or static `metadata`), but stay **thin** — call the matching builder from `@/seo`. Do **not** put SEO logic in `src/shared/` or inline in page components.

### Next.js Metadata API

- Use **`Metadata` / `generateMetadata`** only — **never** `next/head` (deprecated in App Router).
- Root defaults live in **`app/layout.tsx`**: `metadataBase` from `env.publicOrigin` (`WEB_PUBLIC_ORIGIN` or `AUTH_APP_DISPLAY_ORIGIN`), site title template, default OG/Twitter.
- Per-route metadata overrides title, description, `openGraph`, `twitter`, `alternates.canonical`, and (when needed) robots.

### Object pages — query-api `seo` block is source of truth

`ProjectedObject.seo` is attached only when query-api projects with **`includeSeo: true`** (object resolve endpoints). Contract: [`apps/query-api/src/domain/object-projection/projected-object.types.ts`](../../apps/query-api/src/domain/object-projection/projected-object.types.ts) (`ProjectedObjectSeo`: `title`, `description`, `canonical_url`, `json_ld`).

- **`generateMetadata` for object routes must read `model.seo`** via `@/seo` builders — do not build a parallel title from `obj.fields.name`.
- **`seo.canonical_url`** is computed in query-api via [`build-object-canonical-url.ts`](../../apps/query-api/src/domain/object-projection/build-object-canonical-url.ts) and [`@opden-data-layer/site-canonical`](../../libs/site-canonical/src/lib/fallback.ts). Web **must not** hand-build object canonical URLs; use `seo.canonical_url`. If `seo` is absent, fallback to `env.publicOrigin` + object path.
- If `seo.canonical_url` points at a custom object site origin, **accept it as-is** — query-api owns that decision; web does not override.

### JSON-LD

- **Objects:** schema.org payloads are built in query-api [`ObjectSeoService`](../../apps/query-api/src/domain/object-projection/object-seo.service.ts) (`json_ld` is `{}` today — intentional stub; will grow by `object_type`: `Thing`, `Product`, `Recipe`, etc.). Web **injects only** — render via `<JsonLdScript data={model.seo.json_ld} />` in `src/seo/presentation/` when non-empty. **Do not** add or patch schema.org fields on the web side for objects.
- **Posts / profiles:** builders live in `src/seo/domain/` (e.g. `Article`, `Person`) — query-api does not project these entity types yet.
- Validity of `json_ld` is query-api’s responsibility; web still injects what the API returns.

### Canonical URLs (non-object routes)

Build in `@/seo` using `env.publicOrigin` and public URL rules from [`proxy.ts`](src/proxy.ts) (`/@account` → profile, `/object/:id`, post permalinks). One canonical URL per entity; **do not** use `alternates.languages` — locale is not a URL segment (see **i18n** above).

### Open Graph and Twitter

- **`openGraph.images` / `twitter.images`:** absolute URLs from API data:
  - Object: `coverImageUrl`, `avatarUrl`
  - Post (`FeedStoryView`): `thumbnailUrl`, `videoThumbnailUrl`
  - Profile: `avatarUrl`, `coverImageUrl` from profile query
- Resolve relative URLs with `buildPublicUrl()` from `@/shared/infrastructure/http/get-public-origin`.
- When no image is available, fall back to default **`app/opengraph-image.png`** (static site banner).
- Use **`twitter.card: 'summary_large_image'`** when a page has an OG image; otherwise inherit root default (`summary`).

### i18n in metadata

- `@/seo` builders encapsulate **`getRequestLocale()`** + **`loadMessages()`** — no repeated boilerplate in every `generateMetadata`.
- Shareable routes (post, object, profile): prefer API-localized fields (`obj.seo.title` via `X-Locale`) plus i18n suffix keys from locale catalogs for tab/context labels.
- Title fallback chain for objects: `obj.seo.title` → `obj.fields.name` → `object_id`. Never emit an empty `<title>`.
- Do **not** hardcode English title/description on public shareable pages (post, object, profile, home, sign-in) when i18n keys or API fields exist.

### Fetch deduplication

Any loader used by **`generateMetadata` and the page body** must be wrapped in **`react.cache()`**. Reference: [`object-page-model.server.ts`](src/app/(app)/object/[object-id]/object-page-model.server.ts). Object fetches for metadata should request **`includeSeo: true`** (query-api resolve); extend API calls in the same PR when wiring SEO.

### Edge cases

| Situation | Behavior |
|-----------|----------|
| API returned no `seo` (`includeSeo: false` or error) | Builder falls back to root metadata defaults; route must not throw |
| Empty `json_ld` | Skip `<JsonLdScript>`; HTML meta still from `Metadata` |
| Missing OG image | Use default `app/opengraph-image.png` |

### Sitemap and robots

- Add **`app/sitemap.ts`** and **`app/robots.ts`** as Next.js conventions when implementing crawl coverage (dynamic sources: query-api objects/posts/users). Not required on every route change — track in a dedicated SEO PR.

### Don’ts

- Do not use **`next/head`** or ad-hoc `<head>` writes in components.
- Do not build **object** canonical URLs on the web — use **`seo.canonical_url`**.
- Do not duplicate API fetches in `generateMetadata` — reuse **`cache()`** loaders.
- Do not place SEO helpers in **`src/shared/`** — use **`src/seo/`**.
- Do not treat legacy Helmet docs under [`docs/apps/web/spec/pages/user-profile/`](../../docs/apps/web/spec/pages/user-profile/) as App Router patterns.

## Shared code

- **`src/shared/`** uses the same layer idea as feature modules; import via **`@/shared`**.

## Loading UI

- **`loading.tsx`**: not used broadly today — add only when a route segment genuinely needs a Suspense boundary, not by default.

## Server actions

- Return types: use **`Result<T, E>`** from `src/shared/domain/result.ts` for expected failures.

## Form Rules

- Treat forms as contracts, not ad hoc UI handlers.
- Define one canonical schema per payload.
- Reuse the same validation rules on client and broadcast layer.
- Prefer safe parsing over exceptions.
- Return one consistent result shape from every form flow.
- Keep field errors separate from form-level errors.
- Derive validation state from the schema when possible.
- Handle invalid, pending, error, and success states explicitly.
- Normalize input consistently before broadcast.
- Do not add form libraries unless complexity clearly requires them.

## Blockchain broadcast and trx confirmation

After every successful **Hive wallet broadcast** that should update on-chain-backed UI (votes, comments, and similar flows):

1. **Capture `transactionId`** from the broadcast result immediately.
2. **Subscribe on the notifications WebSocket** for that trx id — use **`awaitTrxConfirmation(trxId)`** from **`@/modules/notifications`** (wraps `NotificationsWsClient.subscribeTrx` with a correlation id). Do not poll HTTP for indexer completion.
3. **Show in-place loading** on the affected control while waiting (e.g. spinner on vote count, subtle “waiting for confirmation” on comment submit) — keep optimistic UI until broadcast finishes; switch to confirming state only after you have the trx id.
4. **Refresh server-rendered data** when confirmation arrives **or** when **`TRX_CONFIRMATION_TIMEOUT_MS`** elapses (default 10s): call **`refreshAfterBroadcast(router, revalidateAction)`** from `@/shared/infrastructure/query/refresh-after-broadcast` — it runs a tagged **`revalidateTag`** server action, then **`router.refresh()`**. **Never treat timeout as a hard error** — still refresh so the UI catches up eventually.
5. **New on-chain actions** must follow the same pattern; do not leave stale counts or lists after broadcast.
6. **Paginated client lists** seeded from RSC (`initialPage` / `initialItems`) must re-sync after `router.refresh()` — use **`useSyncedPaginatedList`** from `@/shared/presentation` (or an equivalent `useEffect` on the server initial payload). Counts from parent props update automatically; `useState(initial*)` for list rows does not.
7. **Query-api Data Cache:** page-load clients use **`queryApiFetch`** with **`cacheTags`** (60s GET cache). After broadcast, invalidate via **`updateTag`** in **`revalidateObjectAfterBroadcast`**, **`revalidateUserSocialAfterBroadcast`**, or **`revalidateUserFeedAfterBroadcast`** (`revalidate-after-broadcast.server.ts`) — **not** `queryApiFetchLive` on every page load. `queryApiFetchLive` is for post-broadcast server actions only. POST `/resolve` counts stay fresh; stale lists were from cached GETs without tag invalidation.

Requires a notifications WebSocket URL (**`NOTIFICATIONS_WS_PUBLIC_URL`** at runtime in compose; see [Environment variables](#environment-variables-runtime-not-build)) and a logged-in session (JWT via **`/api/auth/ws-token`**). If WS is unavailable, `awaitTrxConfirmation` waits the timeout then returns so step 4 still runs.

Implementation reference: `story-vote-button.tsx`, `story-comment-editor.tsx`, `modules/notifications/`. Server-side: [`docs/apps/notifications/spec/transport.md`](../../docs/apps/notifications/spec/transport.md).

**ODL envelope broadcasts** (e.g. `update_vote`, `update_create`): use **`useOdlCustomJsonId()`** from `@/config/odl-network-provider` — do not hardcode `odl-mainnet` / `odl-testnet`. **`ODL_NETWORK`** is runtime-only (compose `env_file`); not a Docker build-arg.

## `router.refresh()` and client state

Use **`router.refresh()`** from `next/navigation` when server-rendered data should catch up after a mutation (broadcast confirmed, login/logout, locale change, draft save, etc.). It **re-runs Server Components** for the current route and passes **new props** into existing client boundaries — it is **not** a full page reload and **does not** remount client components by default.

| Updates after refresh | Does **not** update automatically |
|-----------------------|-------------------------------------|
| Props from RSC parent (`model`, counts in nav, `initialPage` passed as prop) | `useState(initialValue)` seeded once at mount |
| Server-only fetches in `page.tsx` / `layout.tsx` | Client list rows, cursor, load-more accumulation |
| Metadata / cookies read on the server | `key` on a child unless the key value changes |

**Checklist for new client UI after a mutation + `router.refresh()`:**

1. **Scalar / flags from props** (follow, bell, authority, vote on a row): keep optimistic local state, add **`useEffect`** to sync when the prop changes — see `user-profile-hero-client.tsx`, `story-vote-button.tsx`.
2. **Paginated lists** from RSC (`initialPage`, `initialItems`): use **`useSyncedPaginatedList`** from `@/shared/presentation` — see `user-social-account-list.tsx`, `object-updates-feed.tsx`, `blog-feed-posts-list.tsx`. Do not rely on Next.js cache invalidation alone; the bug is client `useState`, not stale RSC cache.
3. **Avoid** bumping `key` on every refresh just to reset lists — it drops scroll position and load-more state. Prefer explicit sync.
4. **Symptom to watch for:** server counts or tab badges change, but list rows or card fields stay old — missing sync after refresh.

Primary pattern elsewhere in the app: **`awaitTrxConfirmation(trxId)` → `refreshAfterBroadcast(router, revalidate*)`**. Always refresh even on trx timeout so the UI eventually matches chain/indexer state.

## Hydration warnings — browser extensions (Keychain, password managers)

Browser extensions (primarily **Keychain Hive** and password managers) inject attributes or classes on `<a>` elements *after* SSR HTML is sent but *before* React hydrates. This produces a `className` mismatch warning that **cannot be reproduced without the extension** and is safe to suppress.

### Rule

**All `<Link>` (and plain `<a>`) elements that are navigation anchors must carry `suppressHydrationWarning`** to silence these false-positive mismatches.

```tsx
<Link href={href} suppressHydrationWarning …>
  …
</Link>
```

For raw `<a>` elements use the existing wrapper:

```tsx
import { HydrationSafeAnchor } from '@/shared/presentation/components/hydration-safe-anchor';

<HydrationSafeAnchor href={href} …>…</HydrationSafeAnchor>
```

### When NOT to suppress

Do **not** add `suppressHydrationWarning` to hide real mismatches caused by:
- `typeof window !== 'undefined'` branches in initial render
- `Date.now()`, `Math.random()`, or locale-formatted dates rendered server-side
- Stale server cache diverging from client state

Those must be **fixed** (use `useEffect`, `suppressHydrationWarning` on the specific element only after confirming the mismatch is extension-only).

### How to tell the difference

If the diff in the console shows only `keychainify-checked` added to `className` → Keychain extension, safe to suppress.
If the diff shows data/content changes → real mismatch, fix the root cause.

## Maps (`src/modules/map/`)

- **Public API:** `AppMap`, `AppMarker`, `AppPopup`, `MapProvider`, and types from `@/modules/map` — do **not** import `react-leaflet`, `leaflet`, or MapLibre directly in feature UIs.
- **SSR:** maps are **client-only**; `AppMap` is dynamically loaded. Never instantiate Leaflet in Server Components or root layouts.
- **Engine swap:** implement `MapProviderPort` and pass `<MapProvider impl={…} />`. Default is Leaflet (`leafletMapProvider`).
- **Spec:** [`docs/apps/web/spec/maps.md`](../../docs/apps/web/spec/maps.md).