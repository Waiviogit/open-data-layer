---
id: docs-skills-obl-offers-contracts
title: OBL offers and contracts
description: Discover, publish, and sign OBL offers/contracts; create or cancel service orders on a signed contract.
type: skill
status: active
scope: platform
tags: [obl, offers, contracts, signParams, contract_sign, offer_publish, service_order_create, service_order_cancel, business]
updated_at: 2026-09-30
related:
  - docs/skills/obl-ledger.md
  - docs/skills/obl-disputes.md
  - docs/skills/hive-blockchain-broadcast.md
  - docs/skills/query-api-mcp-routing.md
  - docs/skills/knowledge-api-routing.md
  - docs/spec/open-business-layer.md
  - docs/spec/obl/contracts.md
  - docs/spec/obl/service-orders.md
  - docs/apps/query-api/spec/obl.md
---

# OBL offers and contracts

Discover published offers, publish/retire offer versions, sign contracts (`contract_sign`), and create/cancel service orders on a signed contract.

**Signing / broadcast:** follow [Hive blockchain broadcast](hive-blockchain-broadcast.md) for key custody. OBL ops use `buildObl*` builders and `obl-mainnet` / `obl-testnet` (not `odl-*`).

## When to use

- Find or inspect an OBL offer (`search_obl_offers`, `get_obl_offer`).
- Publish, update, or retire an offer (`offer_publish` / `offer_update` / `offer_retire`).
- Sign a contract for an offer pair (`contract_sign`), including `terms.signParams` → `metadata`.
- Create or cancel a service order on a signed contract (`service_order_create` / `service_order_cancel`).
- Need the deterministic `contract_id` formula or `get_obl_contract` / `get_obl_service_order`.

## When not to use

- Invoices, payments, pair balances, ledger history — [obl-ledger.md](obl-ledger.md).
- Open/resolve disputes or arbiter inbox — [obl-disputes.md](obl-disputes.md).
- ODL catalog objects (`service_offer`, etc.) on `odl-*` — [hive-blockchain-broadcast.md](hive-blockchain-broadcast.md) + object registries.
- Normative rules — [docs/spec/obl/contracts.md](../spec/obl/contracts.md).

## Cycle position

`draft` → **publish offer** → **sign contract** → **service order** → [invoices / payments](obl-ledger.md) → [disputes](obl-disputes.md).

## Network (pick once)

| Network | `custom_json` id |
|---------|------------------|
| Mainnet | `obl-mainnet` |
| Testnet | `obl-testnet` |

Never mix `obl-*` and `odl-*` ids in one OBL workflow. Catalog refs (`service_ref`, `legal_ref`) may point at ODL objects; the OBL envelope id stays `obl-*`.

## Read (query-api MCP)

Prefer [query-api MCP routing](query-api-mcp-routing.md). Tools:

| Intent | Tool |
|--------|------|
| Search offers | `search_obl_offers` |
| Offer detail | `get_obl_offer` |
| Contract detail | `get_obl_contract` |
| Service order detail | `get_obl_service_order` |

HTTP parity: [query-api OBL spec](../apps/query-api/spec/obl.md).

## Steps — discover

1. `search_obl_offers` with `q` / `kind` / `author` / `tags` as needed (`status` default `active`).
2. `get_obl_offer` for versioned fields, `terms` (incl. `signParams`, `dispute_rule`, `arbiter`).
3. Confirm counterparty roles: offer `author` is typically provider; signer is the other party (`client` or `provider` per offer kind).

## Steps — draft and publish

1. Off-chain drafts (JWT, not MCP): `GET/POST/PATCH/DELETE /query/v1/users/:author/obl-drafts`.
2. Publish on-chain with `@opden-data-layer/hive-broadcast`:
   - `buildOblOfferPublishOp` — new offer / first version
   - `buildOblOfferUpdateOp` — append version
   - `buildOblOfferRetireOp` — retire
3. Broadcast via wallet / payload-only / session key per [broadcast skill](hive-blockchain-broadcast.md).
4. After index lag, verify with `get_obl_offer`.

## Steps — sign contract (`buildOblContractSignOp`)

1. Load offer; note `offer_id`, `version`, `dispute_rule`, `arbiter`, `terms.signParams`.
2. Compute **deterministic** `contract_id`:
   - Sort the two Hive accounts lexicographically → `pair_low`, `pair_high`.
   - `contract-{offer_id}-{pair_low}-{pair_high}` (web convention; unique per offer + pair).
3. If `terms.signParams` is set, collect values for each `{ key, label, required? }` and put them in `metadata` (object keyed by `key`). Omit `metadata` when empty / unused.
4. Build op:

```ts
import { buildOblContractSignOp } from '@opden-data-layer/hive-broadcast';

const op = buildOblContractSignOp({
  id: 'obl-mainnet', // or obl-testnet
  contractId: 'contract-offer-…-alice-bob',
  offerId: 'offer-…',
  offerVersion: 1,
  provider: 'alice',
  client: 'bob',
  signer: 'bob', // counterparty posting auth
  metadata: { targetObject: 'product-…' }, // optional; from signParams
});
```

5. Broadcast; wait for indexer; `get_obl_contract` / ledger contracts list to confirm.
6. **One contract per `offer_id` + account pair** — re-sign with same id is rejected / no-op at DB unique index.

## Steps — service orders

Normative rules: [service-orders.md](../spec/obl/service-orders.md).

**Create** (`buildOblServiceOrderCreateOp`): party is `provider` or `client`; signed offer version must still be `active` (indexer skips retired/missing). Client id: `so-{uuid}`. Optional `details`. Web picker only lists contracts whose offer is `active`.

```ts
import { buildOblServiceOrderCreateOp } from '@opden-data-layer/hive-broadcast';

const op = buildOblServiceOrderCreateOp({
  id: 'obl-mainnet',
  serviceOrderId: 'so-…',
  contractId: 'contract-…',
  creator: 'alice',
});
```

**Cancel** (`buildOblServiceOrderCancelOp`): either party. Payload is **only** `{ service_order_id }` — no `canceller` in JSON. Actor is `required_posting_auths[0]`. Already cancelled is a no-op. Existing reports/invoices are not rewritten; new `report_create` / `invoice_issue` that reference a cancelled SO are skipped.

```ts
import { buildOblServiceOrderCancelOp } from '@opden-data-layer/hive-broadcast';

const op = buildOblServiceOrderCancelOp({
  id: 'obl-mainnet',
  serviceOrderId: 'so-…',
  required_posting_auths: ['alice'],
});
```

After index: `get_obl_service_order` / ledger `service-orders` — `status`, `cancelled_by`, `cancelled_at`.

## Gotchas

- Signer must be the counterparty (`required_posting_auths: [signer]`).
- `signParams` only guide UI → `metadata`; they are not separate on-chain fields.
- Draft APIs require auth JWT; agents without session cannot mutate drafts via MCP.
- After first contract for a pair, ledger may start (`started_event_seq`); invoices before that stay `pending` — see [obl-ledger.md](obl-ledger.md).
- Do not put `canceller` in the cancel envelope; indexer uses the Hive signer.

## Verification

- `get_file({ path: "docs/skills/obl-offers-contracts.md" })` body contains `buildOblContractSignOp`, `buildOblServiceOrderCancelOp`, and `obl-mainnet`.
- `search_obl_offers` / `get_obl_contract` / `get_obl_service_order` return the published/signed/cancelled row after index.
- `resolve_doc({ topic: "sign obl contract" })` / `"cancel service order"` routes here.

## Related

- [OBL ledger](obl-ledger.md) · [OBL disputes](obl-disputes.md)
- [Contracts spec](../spec/obl/contracts.md) · [Service orders](../spec/obl/service-orders.md) · [Open Business Layer](../spec/open-business-layer.md)
- [Hive blockchain broadcast](hive-blockchain-broadcast.md)
