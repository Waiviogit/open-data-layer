# web — agent rules

Specialization for this app. **Shared policy** (monorepo, docs standards, cross-cutting Nx) lives in the repo root [`AGENTS.md`](../../AGENTS.md). Web architecture and conventions are also documented under [`docs/apps/web/`](../../docs/apps/web/). This file is the **operational** checklist for `apps/web`.

## Stack

- **Next.js App Router** (`src/app/`) — not NestJS.

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

- Source of truth: **`src/styles/theme.css`** (`[data-theme='…']` CSS variables), extended in **`tailwind.config.js`**.
- Use **semantic** Tailwind utilities from the theme — **no** raw `#…`, `rgb()`, or `rgba()` in `className` or inline styles (except documented exceptions).
- New token role: update **`theme.css`** for every theme block, **`tailwind.config.js`**, and **`docs/apps/web/spec/theme.md`** in the same change.

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

## Hydration

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

Requires **`NEXT_PUBLIC_NOTIFICATIONS_WS_URL`** and a logged-in session (JWT via **`/api/auth/ws-token`**). If WS is unavailable, `awaitTrxConfirmation` waits the timeout then returns so step 4 still runs.

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

## Maps (`src/modules/map/`)

- **Public API:** `AppMap`, `AppMarker`, `AppPopup`, `MapProvider`, and types from `@/modules/map` — do **not** import `react-leaflet`, `leaflet`, or MapLibre directly in feature UIs.
- **SSR:** maps are **client-only**; `AppMap` is dynamically loaded. Never instantiate Leaflet in Server Components or root layouts.
- **Engine swap:** implement `MapProviderPort` and pass `<MapProvider impl={…} />`. Default is Leaflet (`leafletMapProvider`).
- **Spec:** [`docs/apps/web/spec/maps.md`](../../docs/apps/web/spec/maps.md).