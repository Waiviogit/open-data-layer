---
title: Create page object
description: Agent playbook for ODL page — static content via pageContent update.
type: playbook
status: active
scope: platform
tags: [object-create, object-create-playbook, page, agent]
related:
  - docs/skills/object-content-standards.md
---

# Create page object

Static page or content page.

## When to use / not

- **Use** for site pages with `pageContent` body.
- **Not** for raw HTML embed — use `html` type.

## Product baseline fields

`name`, `description`, `image` (product policy).

## Field semantics

| Update | Semantics |
|--------|-----------|
| `pageContent` | Primary page body (semantic baseline); large body → IPFS `batch_import` when `requiresIpfsBatch` |
| `parent` | Site hierarchy parent |
| `website` | Canonical URL if mirrored |

## Categories and tags (soft)

Omit unless classifying the page in discover.

## Locales

Translate `pageContent` and `name` per [object content standards](../object-content-standards.md).

## Research and source hierarchy

- Content from site owner or approved CMS export.

## Images

Optional hero via IPFS per [object content standards](../object-content-standards.md).

## Special constraints

- Sanitize embedded links; no unverified third-party scripts in `pageContent`.

## Verification

`resolve_object`: `fields.pageContent`, `fields.name`.

## Related workflows

- [list](list.md) · [shop](shop.md)
