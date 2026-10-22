---
id: docs-apps-query-api-spec-instacart-recipe-link
title: Instacart recipe shopping link
description: Recipe-only Instacart shopping URL — storefront without keys, IDP recipe link when INSTACART_KEY is set.
type: spec
status: active
scope: query-api
tags: [query-api, instacart, recipe]
updated_at: 2026-10-22
related:
  - docs/apps/query-api/spec/overview.md
  - docs/apps/query-api/spec/openai.md
  - docs/apps/query-api/spec/affiliate-links.md
  - docs/apps/query-api/spec/geoip.md
  - docs/apps/web/spec/object-card.md
  - docs/apps/web/spec/pages/instacart/page.md
  - docs/apps/web/spec/pages/object/routes/recipe-left-rail.md
---

# Instacart recipe shopping link

**Back:** [overview](overview.md) · **Related:** [OpenAI](openai.md), [affiliate links](affiliate-links.md), [GeoIP](geoip.md)

Returns a shopping URL for a `recipe` object that has an `identifier` of type `instacart` (case-insensitive; value optional). Recipes never receive `affiliateLinks` — Instacart is the only merchant surface on that type. Web opens [`/instacart/:id`](../../web/spec/pages/instacart/page.md) first, then this endpoint.

## Route

| Method | Path |
| ------ | ---- |
| `GET` | `/query/v1/objects/{objectId}/instacart-link` |

MCP: `get_object_instacart_link`.

## Headers / query

Same locale and governance headers as other object reads (`Accept-Language` / `X-Locale`, optional `X-Governance-Object-Id`). Optional `?country=` plus GeoIP from `@ReqClientIp` — same resolver as affiliate links.

## Response

Success is always `{ url: string }`.

| Status | When |
| ------ | ---- |
| 200 | Recipe with an instacart identifier |
| 404 | Object missing / not visible |
| 422 | Not a recipe, no instacart identifier, or no usable ingredients on the IDP path |

Missing `INSTACART_KEY` / `OPENAI_API_KEY` is never 503.

## Behavior

1. Require `object_type === recipe` and identifier type `instacart`.
2. **No `INSTACART_KEY`:** `https://www.instacart.com` (host `.ca` when country is `CA`). Optional UTM if a governance instacart affiliate **code** exists. No Redis, OpenAI, or IDP. Ingredients are not required.
3. **Key + Redis hit** `query-api:cache:instacart-recipe:{objectId}`: apply CA + UTM to the cached **bare** URL. Skip OpenAI / IDP. Cache never stores query params.
4. **Key + miss:** format ingredients (OpenAI `json_schema` when `OPENAI_API_KEY` is set; else `{ name }[]` + `[description]`). `servings` is the first integer ≥ 1 from the object `servings` field, else OpenAI `servings`, else `1`. POST Instacart IDP `/idp/v1/products/recipe`. Cache TTL `2_592_000`. Empty ingredients → 422. IDP failure → storefront URL, no cache write.

UTM (only when a partner code exists):

`utm_campaign=instacart-idp&utm_medium=affiliate&utm_source=instacart_idp&utm_term=partnertype-mediapartner&utm_content=campaignid-20313_partnerid-{code}&subId1={uuid}&subId2={host}`

`subId2` is `SITE_CANONICAL_FALLBACK_ORIGIN` hostname with dots stripped.

## Env

All optional. Defaults: `INSTACART_HOST=connect.dev.instacart.tools`, `OPENAI_MODEL=gpt-5.6-luna`.

## Verification

```bash
pnpm nx test query-api -- --testPathPatterns="instacart|openai|env.validation"
```
