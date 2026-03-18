# ADR: PostgreSQL over MongoDB for the ODL indexer storage layer

**Status:** Accepted  
**Date:** 2026-03-11  
**Context:** [architecture.md](architecture.md), [postgres-concept/flow.md](postgres-concept/flow.md), [mongo-concept2/flow.md](mongo-concept2/flow.md)

---

## 1. Context

The Open Data Layer needs a persistent store for five entity types:
`objects_core`, `object_updates`, `validity_votes`, `rank_votes`, and `object_authority`.

Two storage concepts were fully designed and compared:

- **Mongo concept v2** — six collections, projection collection required for searchability ([mongo-concept2/flow.md](mongo-concept2/flow.md))
- **PostgreSQL concept** — five tables, no projection table, query core tables directly ([postgres-concept/flow.md](postgres-concept/flow.md))

This ADR records why PostgreSQL was chosen.

---

## 2. Decision

**Use PostgreSQL as the primary storage engine for the indexer.**

---

## 3. Reasons

### 3.1 The data is inherently relational

The ODL domain model is not a tree of nested documents. It is a normalized graph:

```
objects_core 1──* object_updates 1──* validity_votes
                                  1──* rank_votes
objects_core 1──* object_authority
```

Every event type (`update_create`, `update_vote`, `rank_vote`, `object_authority`) operates on a specific row in a specific table via a typed foreign key. The updates, votes, and authority claims are independent entities that reference each other — the classic shape that relational databases model directly and document stores have to simulate.

Forcing this into MongoDB requires either:

- **Embedding** (v1 design): unbounded array growth inside a single document as votes accumulate — document size blows up with activity.
- **Denormalization** (v2 design): a separate `object_query_projection` collection that must be kept in sync with every write, introducing a consistency surface (`coreSeqAtBuild` drift detection, incremental `$push/$pull`, full rebuild on repair) that does not exist in PostgreSQL at all.

PostgreSQL eliminates the projection table entirely because JOINs over normalized rows are cheap and the query planner can use indexes on both sides.

### 3.2 MongoDB cannot combine text search and geo search in one query

This is a hard engine limitation, not a design choice. A single MongoDB filter cannot contain both `$text` and `$near`:

```javascript
// Illegal — MongoDB returns an error:
db.object_updates.find({
  $text: { $search: "central park" },
  location: { $near: { $geometry: { ... } } }
});
```

PostgreSQL has no such restriction:

```sql
WHERE ou.search_vector @@ to_tsquery('english', 'central park')
  AND ST_DWithin(ou.value_geo, ST_MakePoint($lon, $lat)::geography, $meters)
```

Both predicates live in the same WHERE clause, and the planner picks the cheapest access path. This is why the Mongo projection splits data into separate `textFields` and `geoFields` arrays — each gets its own index, combined text+geo queries require two candidate sets and application-side intersection. That workaround does not scale and adds code complexity.

### 3.3 Cross-collection filtering requires denormalization or slow `$lookup` in MongoDB

A common query pattern is: *find objects of type X whose name contains Y*. In PostgreSQL:

```sql
SELECT ou.object_id
FROM object_updates ou
JOIN objects_core oc ON oc.object_id = ou.object_id
WHERE oc.object_type = 'place'
  AND ou.search_vector @@ to_tsquery('english', 'park');
```

The planner pushes both predicates through the JOIN and uses indexes on both sides — one plan, one round-trip.

In MongoDB, `objectType` lives in `objects_core` and the searchable text in `object_updates`. To filter on both, you must either:

- Denormalize `objectType` (and `weight`, `metaGroupId`) into every update document (that is exactly what the projection does), or
- Use `$lookup`, which runs sequentially stage-by-stage with no cross-stage predicate pushdown.

The projection exists to paper over this. PostgreSQL makes it irrelevant.

### 3.4 MongoDB always requires multiple round-trips; PostgreSQL does not

Even if you query `object_updates` directly in Mongo v2 (without the projection), you still need a second hop to load core rows and votes. The projection exists so that first hop can include `objectType/creator/weight` without loading the core. PostgreSQL eliminates all of this: five targeted queries can be pipelined in a single driver round-trip, and the application joins them in memory by `object_id`. The two-hop pattern is structural in MongoDB for normalized schemas; it is optional in PostgreSQL.

### 3.5 Index cache requirements and memory pressure

MongoDB's WiredTiger cache must hold **all active indexes** to maintain performance. For a deployment with, say, five indexes of 20 GB each:

```
5 × 20 GB = 100 GB required in WiredTiger cache
```

If the working set exceeds available RAM, WiredTiger begins evicting pages and performance degrades sharply and non-linearly — every evicted index page that needs to be re-read costs a random disk seek.

PostgreSQL does not require indexes to fit entirely in RAM. It shares the OS page cache with the rest of the system. Linux uses LRU and adaptive readahead — it keeps hot pages in memory automatically. When the working set exceeds RAM:

- Postgres degrades **gradually** because hot pages stay in the OS cache even when the shared buffer pool is under pressure.
- Cold pages spill to disk but hot index leaf pages remain cached at the OS level without any manual tuning.

At 1B+ records, MongoDB's random IO storm (index cache misses, eviction pressure) becomes a significant operational problem. PostgreSQL's sequential WAL writes and OS page cache integration absorb the same load more predictably.

### 3.6 Write amplification from secondary indexes

MongoDB's write path involves:

1. Write the document.
2. Update every secondary index in the WiredTiger tree.

Each secondary index write is a **random IO** into the B-tree. Under high write throughput, this causes write amplification across multiple random-access data structures.

PostgreSQL uses a **WAL-first** architecture:

1. Append to the WAL (sequential write — fast).
2. Update shared buffers (in memory).
3. Background `bgwriter` flushes dirty pages (sequential IO, batched).

Sequential IO is an order of magnitude faster than random IO at scale. Under sustained write load, this difference is measurable in both throughput and p99 latency.

### 3.7 Backup: Community vs. Enterprise split

MongoDB Community ships `mongodump`, a logical backup analogous to `pg_dump`.

Problems at scale:

- `mongodump` is sequential and slow — large databases take hours or days.
- It imposes significant read load on the cluster during the dump window.
- It does not support point-in-time recovery without oplog tailing, which requires careful setup.
- Consistent snapshots, incremental backups, and PITR are available in **MongoDB Ops Manager / Cloud Manager**, which is an **Enterprise / Atlas** feature.

PostgreSQL includes all of the following in the open-source distribution:

- `pg_basebackup` — streaming physical backup.
- WAL archiving — enables point-in-time recovery to any transaction boundary.
- Incremental backup (PostgreSQL 17+) — ships natively.
- Compatible with pgBackRest, Barman, and WAL-G — production-grade PITR tools with no licensing cost.

For a system that grows to TB-scale data, the MongoDB Community backup story is a significant operational risk. PostgreSQL's backup tooling is first-class and free.

### 3.8 Open-source feature completeness

Several capabilities that ODL needs or will need are standard in PostgreSQL's open-source release but restricted to paid tiers in MongoDB:

| Capability | PostgreSQL OSS | MongoDB Community | MongoDB Enterprise / Atlas |
|---|---|---|---|
| ACID transactions | Yes | Replica-set only, limited | Yes |
| Point-in-time recovery | Yes (WAL) | No — needs Ops Manager | Yes |
| Full-text search | Yes (tsvector + GIN) | Yes (limited) | Yes |
| Geo search (PostGIS) | Yes | Yes (2dsphere) | Yes |
| Combined text + geo | Yes | **No** | **No** |
| Horizontal sharding | Citus / native partitioning | Yes | Yes |
| Advanced monitoring | pg_stat_* (built-in) | Basic | Full tooling |
| Encryption at rest | Yes (OS / TDE) | Enterprise only | Yes |

The pattern is consistent: PostgreSQL delivers production-grade capabilities in its open-source release. MongoDB gates many of the same capabilities behind Atlas or Enterprise licensing, which increases long-term infrastructure cost and creates vendor lock-in risk.

### 3.9 Query planner vs. pipeline model

MongoDB's aggregation pipeline executes stage-by-stage. There is no cross-stage predicate pushdown. The developer must manually decide join order and projection placement.

PostgreSQL's query planner evaluates multiple execution strategies (hash join, nested-loop index scan, merge join, bitmap heap scan) and picks the cheapest plan based on table statistics. For queries that join `objects_core + object_updates + validity_votes`, the planner uses partial indexes, covering indexes, and bitmap scans in combinations that a MongoDB aggregation pipeline cannot replicate automatically.

This matters at scale: as cardinality changes, the planner adapts. The Mongo pipeline does not.

---

## 4. Consequences

### What we gain

- **No projection table.** The entire sync mechanism (`coreSeqAtBuild`, drift detection, incremental `$push/$pull`, full rebuild) is eliminated. Write path is: `BEGIN` → increment seq → upsert → `COMMIT`. Four operations, one transaction.
- **Combined text + geo queries** work natively without application-side intersection.
- **Cross-table filters** (`objectType + full-text`) work in a single query with planner optimization.
- **ACID correctness** without the six-collection consistency contract. `ON DELETE CASCADE` handles dependent-row cleanup automatically.
- **Predictable performance under load.** WAL-sequential writes, OS page cache, gradual degradation when working set > RAM.
- **Full backup / PITR** out of the box. No need for Enterprise licensing to achieve point-in-time recovery.
- **PostGIS** for geo queries — more capable than MongoDB's 2dsphere and fully composable with the rest of the query.

### What we give up

- **Horizontal write scaling** is harder. MongoDB's built-in sharding is more operationally convenient than PostgreSQL partitioning or Citus. This is acceptable at the current scale; Citus is available if needed.
- **Schema migrations** require `ALTER TABLE` rather than schema-free document updates. Mitigated by the fact that the ODL schema is narrow and stable (five tables, typed columns).


### Risk mitigation

- Schema migrations are infrequent and can be done with zero-downtime `ADD COLUMN` patterns.
- Horizontal scaling via read replicas covers the read-heavy query workload. Sharding can be deferred until the write path becomes the bottleneck.


---

## 5. Alternatives considered

### MongoDB v1 (embedded arrays)

Documents with all updates and votes nested inside one object document. Rejected: unbounded document growth as votes accumulate; WiredTiger has a 16 MB document size limit; every update to any sub-field rewrites the entire document.

### MongoDB v2 (normalized collections + projection)

Six collections, projection derived from updates. Rejected: projection sync adds write complexity and a consistency surface; combined text+geo queries still unsupported; structural two-hop read path remains; all other MongoDB scaling concerns apply.

### MongoDB Atlas

Managed MongoDB resolves the backup, monitoring, and operational tooling gaps. Rejected for several reasons: significant vendor lock-in, monthly cost grows with data volume, does not resolve the text+geo limitation or the index cache memory requirements. Critically, ODL is designed to be deployable as open-source infrastructure — anyone must be able to run a full node without a dependency on a proprietary managed service. A hard requirement on Atlas is incompatible with that goal.

---

## 6. References

- [postgres-concept/flow.md](postgres-concept/flow.md) — full PostgreSQL schema, write/read flows, index strategy, comparison table
- [mongo-concept2/flow.md](mongo-concept2/flow.md) — Mongo v2 schema for comparison
- [acceptance-tests.md](acceptance-tests.md) — non-functional targets that informed the choice
- [architecture.md](architecture.md) — service boundaries
