---
id: docs-apps-query-api-spec-affiliate-links
title: query-api affiliate links
description: Geo-scoped merchant affiliate URLs on projected objects, list children, and post-linked objects.
type: spec
status: active
scope: query-api
tags: [query-api, affiliate]
updated_at: 2026-10-21
related:
  - docs/apps/query-api/spec/overview.md
  - docs/apps/query-api/spec/geoip.md
  - docs/apps/query-api/spec/shop-feed-endpoints.md
  - docs/apps/query-api/spec/mcp.md
  - docs/apps/web/spec/object-card.md
  - docs/apps/web/spec/pages/object/routes/options.md
---

# Affiliate links

Query-api builds optional `affiliateLinks` on projected objects after `identifier` is resolved. Host/domain site codes from legacy Waivio are gone: **GOVERNANCE** codes come from `governance.authorities` → `object_ownership` exclusive; **PERSONAL** codes stay on user shop / favorites (`:name`).

**Back:** [overview](overview.md) · **Geo:** [geoip.md](geoip.md) · **Web:** [object card](../../web/spec/object-card.md) · [left-rail options](../../web/spec/pages/object/routes/options.md)

## Surfaces

| Endpoint | PERSONAL |
|----------|----------|
| `GET …/users/:name/shop-objects`, `…/shop-sections` | `:name` |
| `GET …/users/:name/favorites` | `:name` |
| `GET …/categories/objects` | — |
| `POST …/objects/resolve`, `…/resolve-nested` | — |
| `GET …/objects/:id/related|similar|add-on` | — |
| `GET …/discover/objects` | — |
| `GET …/posts/:author/:permlink` | — |

Recipe uses the same shop routes (`types=recipe`). Feed chips (`FEED_OBJECT_UPDATE_TYPES`) and `POST …/favorites/map` are not enriched.

## Country

`CountryResolverService.resolve(clientIp, ?country=)`:

1. Valid override (trim, upper-case, in `VALID_AFFILIATE_GEO`) wins.
2. Else GeoIP `countryCode` from `@ReqClientIp` / MCP request IP.
3. Null country still builds **GLOBAL** links.

MCP: `country` is a tool arg; `clientIp` is request-derived, never a tool arg.

## Codes

- Schema: `affiliateCode[0]` is exactly `PERSONAL` or `GOVERNANCE`. Domain scopes are rejected at index, skipped in the mongo migrator, and deleted by `00069`.
- Empty `governance.authorities` → all active affiliate objects with GOVERNANCE codes (no ownership filter).
- PERSONAL codes on shop / favorites belong to `:name`. Exclusive-owner curator voting does **not** apply: the owner's latest PERSONAL entry is used even when `validity_status` is `REJECTED` (they are not exclusive owners of the merchant affiliate object). Button / template / geo / types stay VALID-only.
- Same `objectId`: PERSONAL overwrites GOVERNANCE on user-scoped routes.
- Redis caches parsed `AffiliateConfig[]` (`query-api:cache:affiliate-*-codes:*`, TTL 1800s), never rendered links. Chance pick (`CODE::n`) runs per request. A failed id lookup returns `[]` and **does not** write the key (a genuine empty result may cache `[]`).
- After `00069`, migrated data has no GOVERNANCE codes until affiliate objects are rewritten on chain. Missing links are expected until those updates exist.
- Web SSR/BFF must forward the browser `X-Forwarded-For` (see [geoip.md](geoip.md)); otherwise GeoIP sees the web container.

## Product ids and placeholders

Product ids come from projected `fields.identifier` as `{ value, type }`. Missing or stale-cache identifier → no links, no throw.

URL templates accept both `$product_id` / `$affiliate_code` and legacy `$productId` / `$affiliateCode`.

Geo cascade for similar programs: country → continent (`COUNTRY_TO_CONTINENT`) → `GLOBAL`.
