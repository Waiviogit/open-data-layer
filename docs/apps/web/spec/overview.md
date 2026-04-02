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
| API routes | Under `src/app/api/` |

## Feature specs

| Doc | Description |
|-----|-------------|
| [architecture.md](architecture.md) | Layers, modules, ports/adapters, CQRS-lite, composition |
| [web-conventions.md](web-conventions.md) | Development rules: boundaries, imports, Result, policies |
| [i18n.md](i18n.md) | Locale resolution, messages, cookies, SSR, RTL |
| [theme.md](theme.md) | Theme preference, `data-theme`, CSS variables, SSR script, Tailwind |

## Verification

| Command | Purpose |
|---------|---------|
| `pnpm nx dev web` | Local dev server |
| `pnpm nx build web` | Production build |
| `pnpm nx test web` | Unit tests |
