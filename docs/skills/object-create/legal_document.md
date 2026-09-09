---
title: Create legal_document object
description: Agent playbook for ODL legal_document — single-writer legal text for OBL offers; no generated claims.
type: playbook
status: active
scope: platform
tags: [object-create, object-create-playbook, legal_document, agent]
related:
  - docs/skills/obl-offers-contracts.md
  - docs/skills/object-content-standards.md
---

# Create legal_document object

Legal document body referenced by OBL offers (single-writer).

## When to use / not

- **Use** when an OBL offer needs binding legal text referenced on chain.
- **Not** for marketing copy or AI-generated terms without legal review.
- **Not** when document already exists — updates restricted by `LegalDocumentWriteGuard`.

## Product baseline fields

`name` (product policy). `legalText` is semantic baseline for OBL use though web publish gate may not require it — always include vetted legal body for offers.

## Field semantics

| Update | Semantics |
|--------|-----------|
| `name` | Document title (e.g. `Terms of Service v2026-01`) |
| `title` | Display title if different from `name` |
| `description` | Short summary for catalog UI — not the legal body |
| `legalText` | Full legal text from counsel or approved template — **never generated**; large body → IPFS `batch_import` when `requiresIpfsBatch` |

## Categories and tags (soft)

Not supported — omit.

## Locales

Legal text may exist per jurisdiction — use separate objects or explicit locale rows only when counsel provides translated versions. Do not machine-translate legal text.

## Research and source hierarchy

1. Counsel-approved document or version-controlled template.
2. Prior published version on chain (for amendments).
3. **Never** invent clauses or generate legal text.

## Images

Not applicable.

## Special constraints

- **Single-writer** — see indexer `LegalDocumentWriteGuard`.
- Linked from OBL offers — create before `service_offered` publish when required.

## Verification

`resolve_object`:

- `fields.legalText` present and matches approved source hash/version
- `object_type` = `legal_document`

## Related workflows

- [OBL offers and contracts](../obl-offers-contracts.md)
- [service_offered](service_offered.md)
