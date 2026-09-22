---
id: web-pages-object-routes-social-links
title: Object page — social links (left rail)
description: "Left-rail Social Links block: URL passthrough vs platform handle mapping."
type: spec
status: active
scope: web
tags: [web, page, object, social]
updated_at: 2026-09-22
related:
  - docs/apps/web/spec/pages/object/page-shell.md
  - docs/apps/web/spec/pages/object/routes/edit-mode.md
---

# Object page — social links (left rail)

**Back:** [page-shell](../page-shell.md) · **Related:** [edit-mode](edit-mode.md)

## Purpose

The left-rail **Social Links** block renders ODL `link` updates (`fields.link[]` with `{ type, value }`). Each row is an external link with a platform icon and label.

## href resolution

Source: [`resolveSocialLinkHref`](../../../../../apps/web/src/modules/object/domain/resolve-social-link-href.ts) via `buildLinkHref` in [`object-projected-fields.ts`](../../../../../apps/web/src/modules/object/infrastructure/object-projected-fields.ts).

| Stored `value` | Result |
|--------------|--------|
| `http://…` or `https://…` | Trimmed value unchanged (no platform prefix, no encoding) |
| Protocol-less URL (`www.instagram.com/foo`, `instagram.com/foo/`, `//instagram.com/foo`) | Prepend `https:` / `https://` when valid |
| Account / handle (`whitegarden_restaurant`, `x`) | Legacy platform prefix (`https://instagram.com/{handle}`, `https://x.com/{handle}`, …) |

Dotted handles (e.g. `user.name`) are **not** treated as URLs unless they include a path/query/fragment after a hostname.

Unsafe schemes (`javascript:`, `data:`) fall through to handle mapping so `ExternalLinkButton` can reject them via `safeHttpUrl`.

## Write

The add-update form stores `value` as an `http(s)` URL or a profile/account name (`UPDATE_LINK`). A single leading `@` is stripped (`@acc` → `acc`). Spaces, URI schemes, and protocol-less URLs (`instagram.com/user`) are rejected on write. Already stored protocol-less values still resolve in the left rail.

The profile field is a plain text input, so a URL or a handle can be pasted. Submit uses the same registry schema.

## UI

[`object-left-rail-panel.tsx`](../../../../../apps/web/src/modules/object/presentation/components/object-left-rail-panel.tsx) — `case 'link'` renders `ExternalLinkButton` rows from `projectedObjectLinkRows`.

## Verification

```bash
pnpm nx test web --testPathPatterns=resolve-social-link-href|object-projected-fields
```

Manual: object with Instagram stored as full URL opens that URL; handle-only value opens `https://instagram.com/{handle}`.
