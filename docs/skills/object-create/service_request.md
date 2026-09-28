---
title: Create service_request object
description: Agent playbook for ODL service_request — OBL catalog request fields budget, capability, SLA, provider, input, output, limitations.
type: playbook
status: active
scope: platform
tags: [object-create, object-create-playbook, service_request, agent, obl]
related:
  - docs/skills/obl-offers-contracts.md
  - docs/skills/object-content-standards.md
---

# Create service_request object

Agent-oriented service request for OBL catalog discovery.

## When to use / not

- **Use** when publishing an OBL-discoverable service **request** (buyer side).
- Pair with `service_offer` matching via `capability` / `priceModel`.

## Product baseline fields

`name`, `description`, `image` when used (product policy).

## Field semantics

| Update | Semantics |
|--------|-----------|
| `capability` | Required capability id for matching |
| `priceModel` | Expected pricing model |
| `currency` | Budget currency |
| `budget` | Budget range or max |
| `sla` | Required SLA constraints |
| `provider` | Single `object_ref` to the `business` asked to provide the service. The business right rail lists these requests. |
| `input` | What the requester will supply |
| `output` | What the requester expects back |
| `limitations` | Constraints the requester will not accept |

## Categories and tags (soft)

- `Category` tag key from `supposed_updates`

## Locales

Translate `name`, `description`, `input`, `output`, `limitations`. Keep `capability`, `budget`, `currency`, `provider` structural.

## Research and source hierarchy

- Requester-provided requirements only.

## Images

Optional; often omitted for requests.

## Special constraints

- See [OBL offers and contracts](../obl-offers-contracts.md).
- `provider` must reference a `business` object.

## Verification

`resolve_object`: `fields.capability`, `fields.budget` or `fields.priceModel`, `fields.provider`, `fields.input`, `fields.output`, `fields.limitations` as specified.

## Related workflows

- [service_offer](service_offer.md)
- [OBL offers and contracts](../obl-offers-contracts.md)
