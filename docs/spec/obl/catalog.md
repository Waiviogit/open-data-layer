---
id: docs-spec-obl-catalog
title: OBL catalog (Phase 1)
description: ODL object and update types used by OBL offers for service_ref and legal_ref.
type: spec
status: active
scope: platform
tags: [obl, catalog]
updated_at: 2026-07-14
related:
  - docs/spec/open-business-layer.md
  - docs/spec/obl/contracts.md
---

# OBL catalog (Phase 1)

**Back:** [Open Business Layer](../open-business-layer.md)

Phase 1 OBL indexing validates `service_ref` and `legal_ref` on offers against ODL catalog object types and supported updates.

## Object types

| `object_type` | OBL usage |
|---------------|-----------|
| `service_offer` | `service_ref` when `kind = offer` |
| `service_request` | `service_ref` when `kind = request` |
| `legal_document` | `legal_ref` on any offer kind |

## Update types (catalog fields)

| `update_type` | Typical use |
|---------------|-------------|
| `capability` | What the service provides or requires |
| `endpoint` | Callable endpoint metadata (`service_offer` only) |
| `priceModel` | Pricing structure |
| `currency` | Accepted settlement currencies |
| `sla` | Service-level expectations |
| `provider` | Single business `object_ref` (`service_offer` and `service_request`). Reverse-listed on that business. |
| `input` | Service input text (`service_offer` and `service_request`) |
| `output` | Service output text (`service_offer` and `service_request`) |
| `limitations` | Service limitation text (`service_offer` and `service_request`) |
| `legalText` | Legal document body (`legal_document` only) |

## Reference rules

- `service_ref` must resolve to an existing object whose `object_type` matches offer `kind` (`service_offer` vs `service_request`).
- `legal_ref` must resolve to `legal_document`.
- `legal_document` objects are **single-writer**: only the object creator may publish `update_create` / `update_vote` / `rank_vote` on that object ([`LegalDocumentWriteGuard`](../../../apps/chain-indexer/src/domain/odl-parser/guards/legal-document-write.guard.ts)).

## Chain vs query

- **chain-indexer** validates refs at `offer_publish` / `offer_update` and persists neutral OBL rows.
- **query-api** exposes published offers and drafts; catalog resolution for agents uses standard object resolve tools.
