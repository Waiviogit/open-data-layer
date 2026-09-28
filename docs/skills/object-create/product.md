---
title: Create product object
description: Agent playbook for ODL product — catalog fields, merchant, pricing, variants, categories.
type: playbook
status: active
scope: platform
tags: [object-create, object-create-playbook, product, agent]
related:
  - docs/skills/object-content-standards.md
  - docs/skills/object-content-routing.md
---

# Create product object

Product or sellable item with catalog fields.

## When to use / not

- **Use** for sellable catalog items (SKU, merchant, price, variants).
- **Not** for intangible services — consider `service_offer` for OBL catalog.
- **Not** when product id already exists in catalog — update instead.

## Product baseline fields

`name`, `description`, `image` (product policy).

## Field semantics

| Update | Semantics |
|--------|-----------|
| `identifier` | SKU / GTIN / canonical product id |
| `price`, `compareAtPrice` | Current and list price from merchant feed |
| `productGroupId` | Shared group key for related variant objects (synced to `meta_group_id`) |
| `option` | Selectable variant axes on **this** object (multi-value JSON) |
| `productWeight`, `size` | Physical attributes for this SKU |
| `merchant`, `manufacturer`, `brand` | Object refs to business entities |
| `featureList` | Bullet features from spec sheet |
| `category` | Shop navigation categories (plural, relevant set) |
| `saleEvent` | Promotional window when applicable |
| `website` | Canonical product URL |

Schema details: `get_update_schema({ update_type })`.

### Options on one object

Use `option` when several choices belong to the **same** product object — same price and same kit/configuration, only the selector differs (e.g. color swatch, size label on one SKU page).

Each `option` row:

```json
{ "category": "Color", "value": "Black", "position": 1, "image": "https://…" }
```

- `category` — axis name (`Color`, `Size`, `Capacity`, …)
- `value` — display value for that axis
- `position` — sort order within the category (default `1`)
- `image` — optional swatch or variant image

Add multiple `option` updates on one object when the product has several axes (e.g. `Color` + `Size`).

### Variants as separate objects

Create **separate** `product` objects when variants differ in **price**, **identifier/SKU**, or **kit/configuration** (different included items, storage, bundle contents).

Link them with the **same** `productGroupId` on every sibling. The indexer materializes this as `objects_core.meta_group_id`; query-api aggregates selectors across the group (`GET /query/v1/objects/{id}/options`).

Per variant object, set:

- own `name`, `price`, `identifier`, `image`, `featureList` as needed
- one or more `option` rows describing **that** variant (e.g. `{ "category": "Color", "value": "Black" }`)
- the shared `productGroupId` (e.g. merchant family id or `brand-slug-product-line`)

Example — same model, different storage (different price/SKU):

```text
product-128gb-black   → productGroupId: acme-phone-x
product-256gb-black   → productGroupId: acme-phone-x
```

Do **not** put conflicting prices on one object via multiple `option` rows — split into siblings instead.

## Categories and tags (soft)

- Shop `category` — type-relevant plural categories
- Discover: `Category`, `Pros`, `Cons` tag keys; `Quality`, `Value` rating dimensions

## Locales

Translate `name`, `description`, `featureList`, tag values. Keep `identifier`, `price` structure, and object refs stable.

## Research and source hierarchy

1. Merchant or manufacturer product page / feed.
2. Barcode databases for `identifier` verification.
3. No invented specs — omit unknown weight/size.

## Images

- Product packshot on white or neutral background.
- Gallery for alternate angles; album before items.

## Special constraints

- Dedupe by `identifier` or canonical URL before create.
- `merchant` ref must exist or be created first.
- One object = one sellable SKU. Use `option` for axes on that SKU; use `productGroupId` siblings when SKUs diverge.

## Verification

`resolve_object`:

- `fields.name`, `fields.image`, `fields.price` when set
- `fields.identifier` matches source
- Relation refs resolve

For variant groups:

- each sibling has the same `fields.productGroupId` (or `productGroupID` in projection)
- `get_object_options` returns merged selectors per category across siblings
- search/category dedupe collapses by `meta_group_id` (one representative per group)

## Related workflows

- [Object content standards](../object-content-standards.md)
- [business](business.md) — for merchant/manufacturer entities
- [Object variant options](../../apps/query-api/spec/object-options.md) — options API semantics
