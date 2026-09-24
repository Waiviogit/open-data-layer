---
id: web-object-card
title: Object card
description: "Single component: `apps/web/src/modules/feed/presentation/components/object-card.tsx`."
type: spec
status: active
scope: web
tags: [web, object-page, components]
updated_at: 2026-09-24
related:
  - docs/apps/web/spec/overview.md
---

# Object card (`ObjectCard`)

**Related:** [feed.md](feed.md), [pages/discover/page.md](pages/discover/page.md), [pages/object/routes/edit-mode.md](pages/object/routes/edit-mode.md).

## Where used

Single component: [`apps/web/src/modules/feed/presentation/components/object-card.tsx`](../../../apps/web/src/modules/feed/presentation/components/object-card.tsx).

| Surface | Notes |
|---------|--------|
| Discover object feed | `/discover?type=…` |
| Discover and profile map pins | `layout="popup"` inside `AppPopup` |
| Feed linked objects | Post body linked object chips |
| User profile shop | Shop object lists |

## Layout variants

| `layout` | When | Mobile behavior |
|----------|------|-----------------|
| `default` | Discover feed, profile shop, post linked objects | Stacked hero image below 640px |
| `catalog` | Object-page list feeds (embedded catalog, related/similar, category, books) | Horizontal row at all viewports; line-clamps in text column |
| `editorRow` | Post editor linked-object row | Compact horizontal row |
| `mapSidebar` | Profile map favorites sidebar | Compact horizontal row, single rating |
| `popup` | Discover and profile map pin bubbles | 88px thumb, name (`text-body-sm`, heading color). Full bubble adds one read-only rating and `price` · tag categories. `popupNameOnly` (desktop rail) is a 40px thumb and the name, capped at 180px wide. No heart, address, description, border, or shadow |

## Layout

- Thumbnail (120×120), brand/parent caption (when present), title link, subtitle (`price` · `object_type` · tag categories).
- **Rating grid** — 2 columns (`grid-cols-2`), fill order left→right, top→bottom (1→left, 2→left+right, 3→+bottom-left, 4→full 2×2).
- Description excerpt (plain text, not italic), max **300 characters** (ellipsis when truncated).
- **Favorite heart** (top-right).

## Rating grid

### Data sources

1. **Registry** — `getRatingDimensionNamesForObjectType(objectType)` reads `OBJECT_TYPE_REGISTRY[objectType].supposed_updates` for `aggregateRating` dimension names (e.g. product: Quality, Value).
2. **Projection** — `fields.aggregateRating[]` from query-api (`update_id`, `dimension`, `averageRating`, `userRating`, `totalVoters`).

`mergeRatingDimensions()` ([`object-card-rating.ts`](../../../apps/web/src/modules/feed/application/dto/object-card-rating.ts)) merges by `dimension`:

- Only **supposed** dimensions are shown (registry order); on-chain aspects with other dimension names are ignored on the card.
- Supposed dimensions without an on-chain row yet appear as empty stars.

### Interaction

Each row uses [`StarRating`](../../../apps/web/src/modules/object/presentation/components/star-rating.tsx):

| State | Broadcast |
|-------|-----------|
| `update_id` present | `buildOdlRankVoteOp` (`rank_vote`) |
| No `update_id` (empty dimension) | `buildOdlUpdateCreateWithRankVoteOp` — one `custom_json`: `update_create` (`aggregateRating`, `value_text` = dimension) + `rank_vote` with `create_event_id` |

Requires logged-in viewer (`viewerUsername` + wallet). Discover passes viewer from server page + `useLoginModal` for guests.

**Indexer:** `rank_vote` must resolve `create_event_id` to the sibling `update_create` in the same envelope (same pattern as `update_vote`). See `RankVoteHandler` in chain-indexer.

## Favorite heart

- **State:** `object.isFavorited` from query-api (viewer has favorited the object).
- **Toggle:** `buildOdlObjectFavoriteOp` — `method: 'add' | 'remove'`.
- **Interactive** only when `viewerUsername` is set; otherwise static icon.

## Verification

```bash
pnpm nx test hive-broadcast --testPathPatterns=odl-operations.spec
pnpm nx test web --testPathPatterns="discover-registry|object-card-rating"
```
