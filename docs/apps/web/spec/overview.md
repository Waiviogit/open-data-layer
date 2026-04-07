# web (Next.js)

**Back:** [Documentation index](../../../README.md) · **Related:** [Architecture](../../../architecture/overview.md), [Getting started](../../../getting-started.md)

## Purpose

The **web** application is the Next.js **App Router** frontend for the Open Data Layer monorepo.

## Scope and stack

| Item | Detail |
|------|--------|
| Framework | Next.js (App Router), React |
| App root | `apps/web/` |
| Entry layout | `apps/web/src/app/layout.tsx` |
| Server actions / cookies | Theme, shell mode, and locale use `'use server'` modules (e.g. `theme/actions.ts`, `shell-mode/actions.ts`, `i18n/runtime/cookies.ts`). Add `src/app/api/` route handlers only when you need external HTTP endpoints. |

## Feature specs

| Doc | Description |
|-----|-------------|
| [architecture.md](architecture.md) | Layers, modules, ports/adapters, CQRS-lite, composition |
| [web-conventions.md](web-conventions.md) | Development rules: boundaries, imports, Result, policies |
| [i18n.md](i18n.md) | Locale resolution, messages, cookies, SSR, RTL |
| [theme.md](theme.md) | Theme preference, `data-theme`, CSS variables, SSR script, Tailwind |
| [layout-system.md](layout-system.md) | Route-group shells, layout primitives, content arrangements, `LayoutProvider` |
| [shell-mode.md](shell-mode.md) | Shell mode preference, `data-shell-mode`, structural token overrides |
| [images.md](images.md) | `next/image` usage, `remotePatterns`, `sizes`, `priority`, UGC |
| [components/story-container.md](components/story-container.md) | Feed row (`StoryContainer` / `Story`), DTO, demo mocks |
| [components/avatar.md](components/avatar.md) | Shared `UserAvatar`, `resolveAvatarUrl` (profile + feed) |
| [pages/index.md](pages/index.md) | Page-level specs directory (user profile, ...) |
| [pages/user-profile/data-loading.md](pages/user-profile/data-loading.md) | Shell profile fetch (query-api, `QUERY_API_URL`) |

## Verification

| Command | Purpose |
|---------|---------|
| `pnpm nx dev web` | Local dev server |
| `pnpm nx build web` | Production build |
| `pnpm nx test web` | Unit tests |
