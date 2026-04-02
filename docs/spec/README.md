# Open Data Layer specification — start here

Single entry point for normative domain documentation. **Developer onboarding** (install, run): [docs/README.md](../README.md).

---

## 1. Purpose and scope

The spec defines a deterministic architecture for:

- Indexing blockchain object/update events
- Resolving competing updates with vote semantics
- Applying governance as **request-time masks** (query layer)
- Overflow publishing (Hive baseline + IPFS, Arweave deferred)

**Normative** = binding for implementations. **Informative** = context, examples, or future work.

---

## 2. Who this is for

| Role | Focus |
|------|--------|
| **Indexer** | Write path, event validation, neutral state, object/update/vote storage |
| **Query / Masking** | Governance resolution, mask precedence, ranking, two-phase query |
| **Platform** | Gateway, billing, plan entitlements, overflow policy |

---

## 3. 10-minute onboarding path

1. Read **Architecture baseline** below (four services).
2. Skim [Services architecture](../architecture/overview.md) for service boundaries and contracts.
3. Read [governance-resolution.md](governance-resolution.md) for how masks are computed.

---

## 4. Architecture baseline

Four-service model (normative):

- **Indexer Service** — stores canonical neutral state; no tenant governance filtering.
- **Query/Masking Service** — applies governance masks per request.
- **Dashboard/Admin/Billing Service** — plans, governance entitlements, usage.
- **API Gateway/Rate-Limit Service** — tokens, quotas, speed classes.

Details: [architecture overview](../architecture/overview.md).

---

## 5. Spec map (all documents)

### Core domain and write path

| Doc | Description |
|-----|-------------|
| [object-uniqueness.md](object-uniqueness.md) | `object_id` global uniqueness, first-write-wins, collision rules |
| [object-type-entity.md](object-type-entity.md) | `ObjectType` as a code-level construct; TypeScript interfaces, update registry, Zod validation |
| [authority-entity.md](authority-entity.md) | Open `object_authority` registry; curator filter; `administrative` authority drives `object_reputation` |
| [vote-semantics.md](vote-semantics.md) | Query-time validity and rank resolution; raw vote storage; community vote weight |
| [reject-codes.md](reject-codes.md) | Canonical indexer and query/masking error codes |

### Governance and query

| Doc | Description |
|-----|-------------|
| [governance-bootstrap.md](governance-bootstrap.md) | V2 initialization; main governance reference; no global lock |
| [governance-resolution.md](governance-resolution.md) | Role precedence, trust traversal, cache invalidation, snapshot format |

### Storage and overflow

| Doc | Description |
|-----|-------------|
| [storage.md](storage.md) | Primary write path (Hive), overflow (IPFS), required datasets |
| [overflow-strategy.md](overflow-strategy.md) | When to use Hive vs IPFS; triggers, lifecycle, Arweave deferred |
| [ipfs-gateway.md](../apps/ipfs-gateway/spec/overview.md) | IPFS Gateway: MFS namespaces, peer sync, read fallback |

### Data model (PostgreSQL)

| Doc | Description |
|-----|-------------|
| [data-model/flow.md](data-model/flow.md) | Schema, write/read flows, indexes, comparison notes |
| [data-model/posts.md](data-model/posts.md) | Hive posts: `posts` + satellite tables (votes, objects, reblogs, languages, links, mentions) |
| [data-model/schema.sql](data-model/schema.sql) | DDL sketch |

### Architecture decisions

| Doc | Description |
|-----|-------------|
| [ADR: PostgreSQL over MongoDB](../architecture/adr/postgres-over-mongo.md) | Why PostgreSQL was chosen over MongoDB |

### Social, platform, validation

| Doc | Description |
|-----|-------------|
| [social-account-ingestion.md](social-account-ingestion.md) | Follow/mute/reblog ingestion; `accounts_current` |
| [monetization.md](monetization.md) | Plan tiers, entitlement mapping, gateway enforcement |
| [acceptance-tests.md](acceptance-tests.md) | Acceptance criteria and non-functional targets |
| [resolved-view-waivio-legacy.md](resolved-view-waivio-legacy.md) | Informative: legacy Waivio pipeline vs ODL resolution |

### Library integration

| Doc | Description |
|-----|-------------|
| [objects-domain.md](objects-domain.md) | ResolvedView assembly for consumers |

---

## 6. Generated reference docs (not committed)

Per-object-type and per-update-type Markdown is **generated** from code registries (`libs/core`). Do not commit `generated/`; run on demand:

```bash
pnpm tsx scripts/gen-object-types-spec.ts
pnpm tsx scripts/gen-object-updates-spec.ts
```

Output: `generated/object-types/`, `generated/object-updates/`. Source of truth: `OBJECT_TYPE_REGISTRY` and `UPDATE_REGISTRY` in `@opden-data-layer/core`.

---

## 7. Role-based reading paths

**Indexer:**  
[architecture overview](../architecture/overview.md) → [object-uniqueness.md](object-uniqueness.md) → [object-type-entity.md](object-type-entity.md) → [vote-semantics.md](vote-semantics.md) → [reject-codes.md](reject-codes.md) → [storage.md](storage.md) → [social-account-ingestion.md](social-account-ingestion.md)

**Query / Masking:**  
[architecture overview](../architecture/overview.md) → [governance-resolution.md](governance-resolution.md) → [vote-semantics.md](vote-semantics.md) → [reject-codes.md](reject-codes.md)

**Platform (gateway / billing / overflow):**  
[architecture overview](../architecture/overview.md) → [monetization.md](monetization.md) → [overflow-strategy.md](overflow-strategy.md)

---

## 8. ODL event ids and envelope

- Main network `custom_json.id`: `odl-mainnet`
- Test network `custom_json.id`: `odl-testnet`

Envelope shape:

```json
{
  "events": [
    { "action": "string", "v": 1, "payload": {} }
  ]
}
```

Actions: `object_create`, `update_create`, `update_vote`, `rank_vote`. Governance is expressed as objects with `object_type = governance` (no separate namespace).
