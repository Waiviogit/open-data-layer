# ADR: Database and query strategy for ODL place queries

## Status

Proposed. Benchmark harness and dual implementations are in place; final decision should be made after running the benchmark with production-scale data (1M+ places) and comparing results.

## Context

The Open Data Layer query/masking service must serve place objects (`object_type=place`) with:

- Single updates: `name`, `map` (geo point)
- Multiple updates: `tags`
- Request-time governance (mocked: `owner`, `admins`, `trusted`)
- Query patterns: by `object_id`, geo (bbox/radius), tags (all/any), pagination

We need to choose:

1. **Database**: MongoDB vs PostgreSQL + PostGIS
2. **Storage strategy**: Composition (denormalized read model) vs Decomposition (normalized objects + updates, query-time assembly)

## Decision

**To be decided after benchmark.** This ADR records the process and criteria.

### Criteria for decision

- **Read latency**: p50, p95, p99 per scenario (see benchmark categories below)
- **Throughput**: requests per second under sustained load
- **Correctness**: Mongo vs Postgres parity (same total, same page length, same objectIds) per scenario
- **Index and storage cost**: size and maintenance for 1M+ places
- **Operational complexity**: deployment, backups, scaling, and team familiarity

### Benchmark categories (four test areas)

| Category | Scenarios | What we measure |
|----------|-----------|------------------|
| **Geo** | by_object_id, list (pagination), bbox_small/large, radius_small/large, mixed (geo+tags) | Latency and correctness for point/bbox/radius and combined geo+tags |
| **Exact update-body** | exact_body (query by exact JSON/text payload match) | Latency and correctness for exact `updateBodyExact` equality |
| **Text search** | text_contains (ILIKE/regex), text_fulltext (fulltext index) | Latency and correctness for name/body search (contains vs fulltext) |
| **Rejection** | rejected_hidden (exclude REJECTED when governance given), rejected_visible (includeRejected=true with finalStatus/decisiveRole/rejectedBy) | Correctness of exclusion/inclusion; rejection is query-time derived from governance + raw `rejected_by` (vote semantics) |

Recommendation can be split by feature area: e.g. prefer Postgres for geo if GIST wins; prefer Mongo for text if its text index wins; both must pass correctness for rejection semantics.

### How to run the benchmark

1. Start stack and seed (see [spec/benchmarks/query-strategy/CLI-RUNBOOK.md](../benchmarks/query-strategy/CLI-RUNBOOK.md) for full steps).
2. **Composition**: with query apps running via Docker Compose, from `spec/benchmarks/query-strategy` run with `REPORT_FILE=bench-report-composition.json`; then `REPORT_FILE=bench-report-composition.json node report.js` for markdown.
3. **Decomposition**: stop compose app containers, start both apps with `QUERY_STRATEGY=decomposition` (see runbook), then run benchmark with `REPORT_FILE=bench-report-decomposition.json`.
4. Compare `bench-report-composition.json` and `bench-report-decomposition.json` (latency, correctness, rejection semantics).

### Evidence (benchmark runs)

- **Correctness**: By-id parity is enforced (same objectId and decisive fields or both null). List queries use stable sort by `object_id` / `objectId`; composition run with rebuilt images shows full parity (all scenarios pass correctness).
- **Composition run (10k places, 30 iter)** — artifact: `spec/benchmarks/query-strategy/bench-report-composition.json`. All scenarios pass correctness (by_object_id, list_page_1, list_page_mid, bbox, radius, tags_all, tags_any, mixed, exact_body, text_contains, text_fulltext, rejected_hidden, rejected_visible). Rejection semantics pass for both DBs; rejected_visible has non-zero rejected rows. Postgres leads p50/req-s on most scenarios; MongoDB leads on radius_small/large and text_fulltext.
- **Decomposition**: hasFilters logic fixed so unfiltered list (no governance) uses the no-filter path and returns correct totals. Run decomposition benchmark per CLI-RUNBOOK (start apps with `QUERY_STRATEGY=decomposition`), save `bench-report-decomposition.json`, and add a one-line evidence summary here when available.
- **Rejection**: rejected_hidden and rejected_visible semantics pass for Mongo and Postgres in composition.

### Recommendation

- **Correctness gate**: Composition benchmark passes all parity and semantics checks with current images. Decomposition benchmark should be run per runbook and confirmed.
- **Per-category (composition evidence)**: Postgres+PostGIS is faster for by_object_id, list, bbox, tags, mixed, exact_body, rejected_hidden, rejected_visible; MongoDB is faster for radius_small/large and text_fulltext. For a single-DB choice: prefer **PostgreSQL+PostGIS** if geo/list/tags and rejection latency matter most; prefer **MongoDB** if radius and fulltext search latency dominate.
- **Strategy**: Composition is validated (correctness and semantics pass). Run decomposition benchmark, compare latency/correctness, then lock strategy in this ADR.
- **Next steps**: (1) Run decomposition benchmark per runbook and record artifact. (2) Lock DB and strategy in this ADR. (3) Deprecate or retain the other app for A/B.

## Alternatives considered

| Option | Pros | Cons |
|--------|------|------|
| **MongoDB + composition** | Single collection, 2dsphere index, simple writes | Denormalization and index size; less SQL tooling |
| **MongoDB + decomposition** | Normalized updates; flexible schema | Query-time assembly cost; multiple collections to index |
| **PostgreSQL+PostGIS + composition** | GIST indexes, SQL, strong consistency | More schema and migration discipline |
| **PostgreSQL+PostGIS + decomposition** | Single source of truth; standard relational model | Joins and assembly cost; materialized views add complexity |

## Consequences

- Two query apps (`query-mongo`, `query-postgres`) and shared contracts (`@opden-data-layer/query-contracts`, `@opden-data-layer/query-domain`) remain in the repo until a winner is chosen; then the other app can be deprecated or kept for A/B or fallback.
- Governance remains mocked; once the DB strategy is fixed, governance resolution (trust traversal, cache invalidation) will be implemented on top of the chosen stack.
- Rejection/validity is resolved at query time from governance context and raw vote evidence (`rejected_by`), not stored as static status (see [spec/vote-semantics.md](../vote-semantics.md)). Benchmark rejection scenarios pass governance (e.g. `owner=user-0`) so exclusion and metadata (finalStatus, decisiveRole, rejectedBy) are deterministic and parity-checked.
- Seed and benchmark scripts are deterministic (SEED_SEED) so results are reproducible.

### Mocked trusted fallback and vote-spec gaps

- **Mocked authority rule**: Rejection resolution uses hierarchy **owner > admin > trusted**. If `rejected_by` equals the context owner, status is REJECTED with decisiveRole `owner`; else if in `admins`, REJECTED with `admin`; else if in `trusted`, REJECTED with `trusted`. In this mocked phase, trusted is treated as having reject authority for any object; the full vote spec constrains trusted to "latest trusted wins, but only on objects he has authority update" (LWTW). Object-level authority is not yet modeled, so the implementation does not restrict trusted by object.
- **Remaining gaps for full vote-spec compliance**: (1) **Canonical order**: Decisive vote should be "latest" by `(block_num, trx_index, op_index, transaction_id)` when multiple voters exist in the same role tier; current logic uses a single `rejected_by` and does not resolve multiple votes by event order. (2) **Trusted object authority**: Trusted votes should count only for updates on objects where the trusted user has authority; that requires an authority model and possibly extra indexes. (3) **Rank channel**: This ADR and the benchmark focus on validity (`update_vote`); rank resolution (`rank_vote`) is out of scope here.

## References

- [spec/README.md](../README.md) — ODL spec entry point
- [spec/benchmarks/query-strategy/](../benchmarks/query-strategy/) — Benchmark runner and report
- [docker-compose.yml](../../docker-compose.yml) — Stack and seed job
