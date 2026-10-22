---
id: web-pages-instacart-page
title: Instacart recipe wait page
description: Same-origin `/instacart/:id` interstitial — shows loading copy, fetches the Instacart BFF, then replaces the tab with the Instacart URL.
type: spec
status: active
scope: web
tags: [web, page, instacart, recipe]
updated_at: 2026-10-22
related:
  - docs/apps/web/spec/pages/index.md
  - docs/apps/web/spec/object-card.md
  - docs/apps/query-api/spec/instacart-recipe-link.md
---

# Instacart recipe wait page

**Back:** [pages index](../index.md) · **Related:** [object-card](../../object-card.md), [query-api instacart-recipe-link](../../../query-api/spec/instacart-recipe-link.md)

## Purpose

Avoid a blank `about:blank` tab while Instacart IDP/OpenAI runs (often 10–15s). Clicking Get Ingredients opens this same-origin page immediately.

## Route

| Public URL | App Router file | Shell |
|------------|-----------------|-------|
| `/instacart/:id` | `(immersive)/instacart/[object-id]/page.tsx` | `ImmersiveShell` (no app chrome) |

`robots: noindex, nofollow`. Direct visits work the same as a button click.

## Behavior

1. Render carrot + `Instacart_Recipe_Loading`.
2. Client `GET /api/objects/:id/instacart-link` (no prefetch from the opener).
3. `200` + `{ url }` → `location.replace(url)` so Back skips this page.
4. Failure → stay here and show `Instacart_Link_Failed`. Do not `window.close()`.

The card/hero button only `window.open('/instacart/:id')`. If the popup is blocked, the button shows `Instacart_Link_Failed`.
