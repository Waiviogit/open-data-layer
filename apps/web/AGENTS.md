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

- Message catalogs: `src/i18n/locales/*.json`.
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