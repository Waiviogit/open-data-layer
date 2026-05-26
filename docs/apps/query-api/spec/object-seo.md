# query-api — object SEO projection

**Back:** [overview](../overview.md)

## `ProjectedObject.seo`

Attached when `ObjectProjectionService.project()` is called with **`includeSeo: true`** (object resolve / get-by-id paths).

| Field | Source |
|-------|--------|
| `title` | `fields.name` when string |
| `description` | `fields.description` when string |
| `canonical_url` | [`buildObjectCanonicalUrl`](../../../apps/query-api/src/domain/object-projection/build-object-canonical-url.ts) via `@opden-data-layer/site-canonical` |
| `json_ld` | [`buildObjectJsonLd`](../../../apps/query-api/src/domain/object-projection/jsonld/build-object-json-ld.ts) by `object_type` |

List/search/discover projections keep **`includeSeo: false`** to avoid payload bloat.

## JSON-LD `@type` by `object_type`

| `object_type` | schema.org `@type` |
|---------------|-------------------|
| `product` | `Product` (+ `Offer` when `fields.price`) |
| `recipe` | `Recipe` (+ `recipeIngredient`, `cookTime`, `nutrition`) |
| `book` | `Book` |
| `restaurant` | `Restaurant` |
| `place` | `Place` |
| `business` | `LocalBusiness` |
| `dish`, `drink` | `MenuItem` |
| `person` | `Person` |
| `service` | `Service` |
| `shop` | `Store` |
| *(default)* | `Thing` |

Place-like types map `fields.address` → `PostalAddress`, `fields.geo` → `GeoCoordinates`, plus optional `telephone`, `email`, `website`/`link`.

## Web consumption

See [`apps/web/AGENTS.md`](../../../apps/web/AGENTS.md) **SEO and metadata** — web injects `seo.json_ld` via `JsonLdScript`; do not patch schema.org on the client for objects.
