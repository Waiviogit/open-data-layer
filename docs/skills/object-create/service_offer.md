---
title: Create service_offer object
description: Agent playbook for ODL service_offer — OBL catalog fields capability, endpoint, priceModel, SLA, provider, input, output, limitations.
type: playbook
status: active
scope: platform
tags: [object-create, object-create-playbook, service_offer, agent, obl]
related:
  - docs/skills/obl-offers-contracts.md
  - docs/skills/object-content-standards.md
---

# Create service_offer object

Agent-oriented service offering for OBL catalog discovery.

## When to use / not

- **Use** when publishing an OBL-discoverable service offer.
- **Not** for generic business pages — use `business` or `service`.
- Link `legal_document` when terms are required.

## Product baseline fields

`name`, `description`, `image` (product policy).

## Field semantics

| Update | Semantics |
|--------|-----------|
| `capability` | Machine-readable capability id(s) for OBL matching |
| `endpoint` | Service endpoint URL or API base |
| `priceModel` | Pricing model descriptor per OBL spec |
| `currency` | ISO currency when price applies |
| `sla` | SLA JSON per operator spec |
| `price` | Listed price when applicable |
| `website` | Marketing or docs URL |
| `provider` | Single `object_ref` to the `business` that offers this service. The business right rail lists these offers. |
| `input` | What the service takes as input |
| `output` | What the service produces |
| `limitations` | Constraints or limits of the service |

## Categories and tags (soft)

- `Category`, `Pros`, `Cons` tag keys; `Quality`, `Value` ratings

## Locales

Translate `name`, `description`, `input`, `output`, `limitations`, tag values. Keep `capability`, `endpoint`, `priceModel`, `currency`, `provider` stable.

## Research and source hierarchy

- Operator-provided OBL catalog spec only.
- No invented endpoints or SLAs.

## Images

Logo or service icon; IPFS before broadcast.

## Special constraints

- Follow [OBL offers and contracts](../obl-offers-contracts.md) after object exists.
- `legal_document` ref when binding terms apply.
- `provider` must reference a `business` object.

## Verification

`resolve_object`: `fields.capability`, `fields.endpoint`, `fields.provider`, `fields.input`, `fields.output`, `fields.limitations`, baseline fields.

## Related workflows

- [OBL offers and contracts](../obl-offers-contracts.md)
- [legal_document](legal_document.md)
- [service_request](service_request.md)
