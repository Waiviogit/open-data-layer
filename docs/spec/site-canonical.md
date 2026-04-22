# Site canonical (`objects_core.canonical` / `canonical_creator`)

**Back:** [Spec index](README.md) · **Related:** [objects-core](data-model/objects-core.ts), [flow](data-model/flow.md)

Variant **B** is fixed: `objects_core.canonical` stores **only** a normalized `https://` URL. Legacy non-URL values are cleared at migration time. Display/sort uses other fields (e.g. resolved `name`), not `canonical`.

## Winner `description`

- Resolve with the same governance snapshot and `ObjectViewService` / `resolveObjectView` as other indexer logic.
- **Locale for the winning description:** `en-US` (fixed in code; change requires a code update and spec note).
- Single-cardinality tie-break when `event_seq` is equal: smallest `update_id` (see [vote-semantics](vote-semantics.md)).
- **Site author** for Hive `posting_json_metadata` and `site_registry` is the **winning update’s `creator`**, not necessarily `objects_core.creator`.

## Pipeline (parse → normalize → SSRF → health → store)

Shared library: `@opden-data-layer/site-canonical`.

1. Parse `posting_json_metadata` JSON; read top-level string field `website`.
2. **`website` must be a primitive string.**
3. `normalizeWebsiteToHttpsUrl` → single normalized `https://host…` form.
4. SSRF / block list: localhost, private RFC1918, link-local, disallowed hosts/IPs, non-`http(s)` (see `isAllowedPublicHttpsUrl`).
5. Health: `GET` via `fetch`, manual redirects (max 5), timeout ~4s; success when final status is 2xx–3xx; 401/403 and 5xx count as failure.
6. **Stored value:** health `finalUrl` when the full chain stays allowed; otherwise **fallback** `buildFallbackCanonicalUrl(objectId, fallbackOrigin)` (one template from config everywhere: indexer, scheduler, query-api).

## Event-driven recompute (chain-indexer)

- In-process event `SITE_CANONICAL_RECOMPUTE_EVENT` with `object_id`.
- Emitted when ODL writes can change the winning `description` or its ordering/validity: `update_create` (`description`), `update_vote` for that update (including `vote = remove`). `rank_vote` does not apply to single-cardinality `description` and does not emit this event.
- **Postgres queue** `canonical_recompute_queue` with `UNIQUE(object_id)` for dedup; worker claims with `FOR UPDATE SKIP LOCKED`, then reloads winner from DB (event is not source of truth).
- **Conditional write** on `objects_core`: `WHERE (canonical IS DISTINCT FROM $new OR canonical_creator IS DISTINCT FROM $newCreator)`.

## Hive cache (Redis only)

- Key pattern and TTL follow `AGENTS.md` / `apps/chain-indexer` `redis-keys` + `siteCanonical.accountCacheTtlSec`.
- `get_accounts` → JSON `posting_json_metadata` string; safe JSON parse.

## `site_registry`

- One row per `creator` (winning-description author). Tracks `website_*`, `effective_canonical`, `site_state` (`active` | `fallback`), reachability, `consecutive_fail_count`, last check metadata.
- Updated from indexer after a successful pipeline run for an object.

## Daily job (scheduler)

- Job `site-registry-daily`: batches over `site_registry`, re-runs health on `website_normalized`.
- **Anti-flap:** only after **3** consecutive failures while the row was **active** do we switch to **fallback** and **bulk** `UPDATE objects_core` for `canonical_creator = creator` using per-object `buildFallbackCanonicalUrl`.
- On success after failures, or when the effective URL changes: **bulk** set `objects_core.canonical` to the new `finalUrl` for that creator (shared site URL).

## Query API

- `ObjectSeoService` / `buildObjectCanonicalUrl`: use `objects_core.canonical` when it matches `https://…`; else fallback origin + `/object/{id}` via the same `buildFallbackCanonicalUrl` helper.
