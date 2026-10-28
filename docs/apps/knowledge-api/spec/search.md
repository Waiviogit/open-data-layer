---
id: docs-apps-knowledge-api-spec-search
title: Knowledge hybrid search
description: Hybrid FTS, trigram, and route resolution for agent doc discovery.
type: spec
status: active
scope: knowledge-api
tags: [knowledge-api, search, mcp, fts, trigram]
updated_at: 2026-06-11
related:
  - docs/apps/knowledge-api/spec/overview.md
---

# Knowledge hybrid search

## Purpose

Improve doc discoverability for agents without embedding APIs: **prefix FTS** (`to_tsquery`), **cover-density rank** (`ts_rank_cd`), and **pg_trgm** fuzzy match on file metadata.

## Scoring

Per chunk result:

```
score = 1.0 * ts_rank_cd(chunk, query, 32)
      + 0.6 * similarity(file.routing_text, query)
      + title_boost (0.5 if ILIKE)
      + description_boost (0.35 if ILIKE)
      + type_boost (skill +0.25, spec/lesson/agents +0.2, overview -0.1)
      + status_boost (active +0.1, else -0.5)
```

FTS query uses autocomplete-style `to_tsquery` (last token prefix), same pattern as query-api search.

If FTS returns fewer than `limit` rows, **trigram fallback** adds file-level hits (`routing_text % query`).

## Route resolution

`resolve_doc` and `get_context` use `KnowledgeRouteResolver`:

1. Curated keyword routes (skills, getting-started)
2. File-level trigram on `routing_text` (with optional `scope`)
3. Hybrid search fallback

High-confidence routes load chunks via `getChunksForPaths` (chunk 0 per file) instead of random FTS chunks.

## Index fields

| Column | Source |
|--------|--------|
| `description` | Frontmatter or first body line |
| `routing_text` | title + description + path slugs + tags (at reindex) |

Migration: `00020_knowledge_search_hybrid` (`pg_trgm`, GIN indexes).

## MCP tools

| Tool | Role |
|------|------|
| `resolve_doc` | Best path(s) for a task |
| `search_knowledge` | Chunk-level hybrid search |
| `get_context` | Router + chunks for implementation |
| `list_files` | Paginated catalog (`limit`/`offset`) |

## Verification

```bash
pnpm nx test knowledge
pnpm e2e:knowledge-api
```
