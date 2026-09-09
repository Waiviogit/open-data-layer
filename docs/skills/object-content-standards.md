---
title: Object content standards
description: Common rules for ODL object create — dedupe, sources, locales, images, broadcast, and verification.
type: skill
status: active
scope: platform
tags: [object-create, agent, content, standards]
related:
  - docs/skills/object-content-routing.md
  - docs/skills/hive-blockchain-broadcast.md
  - docs/skills/hive-has-agent-wallet.md
  - docs/skills/ipfs-image-upload.md
  - docs/skills/hive-post-create.md
---

# Object content standards

Shared **HOW** rules for agent object creation. Type-specific playbooks live in `docs/skills/object-create/{objectType}.md` and add only deltas.

## Preflight (every create)

1. **Choose creation path**
   - **Full web create** — strict product readiness in `/object-create`.
   - **Editor quick-create** — name-only draft + seeds.
   - **Agent-wallet** — schema validation only; agents must still apply **product baseline** from `get_object_create_playbook.required_updates`.

2. **Find before create** — query-api `search` / `resolve_object`; check canonical website, `identifier`, or address. Do not duplicate an existing entity.

3. **New vs existing**
   - Existing object → `odl_build_update_create`.
   - New object → `odl_build_object_create`.

4. **Object id** — prefer web-compatible `{random-3-letter-prefix}-{slugified-name}` (see `apps/web/src/modules/object-create/domain/generate-object-id.ts`). Agent-wallet fallback `${objectType}-{uuid8}` is acceptable only when product-compatible id is not needed. Check collision before broadcast; duplicate `object_create` may be silently skipped by the indexer.

5. **Evidence** — factual fields (price, hours, address, nutrition, legal text) only from a source. Mark generated marketing prose as generated. Omit unknown facts; never invent.

6. **User authorization** — prepare proposal/draft freely; chain broadcast and companion-post publication only on explicit user request.

## Hive posts

- Root posts (articles, recipe walkthroughs, companion posts): [hive-post-create.md](hive-post-create.md) + agent-wallet `hive_build_post`.
- Object Reviews threads (Leo): [hive-thread-create.md](hive-thread-create.md) — single `comment` op, body `#object_id` anchor, no `hive_build_post`.
- Include at least one WAIV-eligible tag when WAIV potential matters; do not default beneficiaries.
- Broadcast via `wallet_broadcast` / `has_broadcast` only after user approval.

## Locales (bilingual content)

1. Set `primaryLocale` to the request/source language (BCP-47, e.g. `ru-RU`).
2. For **human-readable localizable** updates, when `primaryLocale !== en-US`, create two rows: primary locale + `en-US`. Do **not** translate structural IDs, URLs, object refs, currencies, coordinates, or canonical taxonomy keys.
3. Never mix two languages in one `value`; English is a standalone translation, not a suffix.
4. For localizable JSON, translate display-text subfields only; preserve refs/IDs/shape. Example: `menuItem.title` is translatable; `link_to_object`, `object_type`, `link_to_web`, `style` are not.
5. For `tagCategoryItem`, `category` stays the canonical registry name (`Cuisine`, `Meal Type`, …) in all locales; only `value` is translated.

Example `odl_build_object_create` fields:

```json
{ "updateType": "name", "value": "Борщ", "locale": "ru-RU" },
{ "updateType": "name", "value": "Borscht", "locale": "en-US" }
```

Use `get_update_schema({ update_type })` → `localizable` to decide per field.

## Categories and tags (soft)

| Update | Purpose | Rules |
|--------|---------|-------|
| `category` | Shop navigation (resolved projection, up to ~15) | Type-specific relevant set; use plural shop categories when appropriate |
| `tagCategory` + `tagCategoryItem` | Discover filters | `category` key **only** from `supposed_updates`; values are soft examples |
| No supposed tag categories | — | Do not invent names; omit tags or discover existing platform vocabulary first |

`supposed_updates` is autocomplete metadata — **not** required. Product baseline is `required_updates` from `get_object_create_playbook`.

## Images

1. Source: official/stable URL or generated image. No transient CDN hotlinks.
2. Prepare square/crop per type playbook; upload via IPFS skill before broadcast.
3. **Gallery ordering**: in initial `object_create` fields, create `imageGallery` album before `imageGalleryItem`; or after create use `odl_build_gallery_item` (ensures album). Agent-wallet object-create builder does not add the album automatically.
4. See [IPFS image upload](ipfs-image-upload.md) for upload flow and auto-like behavior (no follow-up `update_vote` after `update_create`).

## Broadcast

- Check payload size warnings from `odl_build_object_create` (`perOpBytes`, `suggestIpfsBatch`, `requiresIpfsBatch`).
- When **`requiresIpfsBatch`** is true, do **not** put large body text on chain in a direct `custom_json` — upload the envelope via [ipfs-file-upload](ipfs-file-upload.md) and broadcast **`batch_import`** only.
- Broadcast in small groups per [HAS agent wallet](hive-has-agent-wallet.md) guidance.
- On consecutive `expired` statuses, relogin before retry; verify chain state first.
- Do not add duplicate object/user refs — web filters these; agent-wallet does not.

## Verification

After broadcast, confirm via query-api `resolve_object`:

- `object_id`, `object_type`, `creator`
- Each required/baseline field under `fields.*`
- Locale-specific values when bilingual

## Related

- [Object content routing](object-content-routing.md) — intent → playbook
- [Hive blockchain broadcast](hive-blockchain-broadcast.md) — builders and ops
- Per-type playbooks: `list_files({ type: "skill", tags: ["object-create-playbook"] })` or `get_object_create_playbook({ object_type })`
