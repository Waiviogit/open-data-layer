---
title: Create governance object
description: Agent playbook for ODL governance — single-writer snapshot, admins, moderation; not generic create.
type: playbook
status: active
scope: platform
tags: [object-create, object-create-playbook, governance, agent]
related:
  - docs/spec/governance-resolution.md
  - docs/skills/object-content-standards.md
---

# Create governance object

Governance snapshot: admins, trusted, moderation, object control.

## When to use / not

- **Use** only when deploying a governed site/community per [governance-resolution.md](../../spec/governance-resolution.md).
- **Not** a generic content object — no marketing description or generated claims.
- **Not** without explicit operator intent — creator becomes authority source.

## Product baseline fields

`name` only (product policy). No `description` or `image` on this type.

## Field semantics

| Update | Semantics |
|--------|-----------|
| `admins`, `trusted`, `moderators` | Hive account lists — exact accounts from operator |
| `authorities`, `restricted`, `banned`, `whitelist` | Access control sets |
| `authors` | Activity author allowlist (opt-in per request; see governance spec §14) |
| `objectControl` | Per-object moderation rules |
| `inheritsFrom` | Parent governance object ref |
| `validityCutoff` | Snapshot cutoff semantics per spec |

## Categories and tags (soft)

Not supported — omit.

## Locales

See [object content standards](../object-content-standards.md).

## Research and source hierarchy

- Values come **only** from the deploying operator's specification.
- Never generate or guess account names.

## Images

Not applicable — do not add `image` updates.

## Special constraints

- **Creator-only effective snapshot** — see governance spec.
- Updates after create are highly restricted; plan initial `admins`/`trusted` carefully.
- This is not a discoverable consumer object.

## Verification

`resolve_object`:

- `object_type` = `governance`
- `fields.admins` / `fields.trusted` match operator spec
- No spurious marketing fields

## Related workflows

- [governance-resolution.md](../../spec/governance-resolution.md)
- [Object content standards](../object-content-standards.md)
