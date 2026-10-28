---
id: docs-apps-knowledge-api-spec-overview
title: knowledge-api
description: MCP HTTP service for agent access to docs, skills, hybrid search, and ODL registries.
type: overview
status: active
scope: knowledge-api
tags: [knowledge-api, overview]
updated_at: 2026-06-11
related:
  - docs/README.md
  - docs/apps/knowledge-api/spec/search.md
---

# knowledge-api

MCP HTTP service for agent access to project documentation, skills, lessons, and ODL object/update registries.

## Agent first visit

1. MCP `initialize` — read server **instructions** (workflow + key paths).
2. Install skills locally: `npx skills add https://github.com/Waiviogit/skills`. MCP is the fallback.
3. Resource `odl-knowledge://routing` or `get_file({ path: "odl/knowledge-api-routing/SKILL.md" })`.
4. `resolve_doc({ topic: "<task>" })` → `get_file` on top path.
5. `list_files({ type: "skill" })` — playbooks with `description` one-liners.
6. Chain payloads: `get_object_create_playbook` → `get_object_type` / `get_update_schema` (not search).

Canonical detail: skill `knowledge-api-routing`. Search detail: [hybrid search](search.md).

Legacy `docs/skills/...` paths still resolve via `get_file` for one release (`moved_from` in the response).

## Stack

- NestJS, Kysely + Postgres (`knowledge_files`, `knowledge_chunks`)
- `@modelcontextprotocol/sdk` — Streamable HTTP, stateless `POST /knowledge/mcp`
- Default port **7400** (`KNOWLEDGE_API_PORT`)
- Hybrid search: FTS (`to_tsquery` prefix) + `ts_rank_cd` + `pg_trgm` on `routing_text`

## MCP tools

| Tool | Source |
|------|--------|
| `resolve_doc` | Curated routes + trigram + hybrid search |
| `search_knowledge` | Hybrid FTS + trigram on indexed chunks |
| `get_file` | Full markdown body from `knowledge_files` |
| `get_context` | Route resolver + chunk pick (fallback search) |
| `list_files` | Filter + pagination (`limit`/`offset`, `total`) |
| `list_tags` | Tag frequency from indexed files |
| `reindex` | In-process reindex (dev only; `KNOWLEDGE_ALLOW_REINDEX=true`) |
| `list_object_types` | `OBJECT_TYPE_REGISTRY` (live) |
| `get_object_type` | Registry + supported/supposed updates |
| `get_object_create_playbook` | Registry + product baseline + indexed type playbook excerpt |
| `list_update_types` | `UPDATE_REGISTRY` (live) |
| `get_update_schema` | Zod → JSON Schema + example payload |

## MCP resources and prompts

| URI / name | Content |
|------------|---------|
| `odl-knowledge://routing` | Routing skill markdown |
| `odl-knowledge://catalog/skills` | JSON skills catalog |
| `odl-knowledge://doc/{path}` | Doc by repo path |
| Prompt `first_visit` | Numbered onboarding steps |

## CI verification tiers

| Tier | Trigger | Command |
|------|---------|---------|
| 0 | `docs/**` in PR | `pnpm check:agent-docs` |
| 1 | `libs/knowledge/**`, `apps/knowledge-api/**` | `pnpm nx test knowledge`, `pnpm nx test knowledge-api` |
| 2 | Nightly / `workflow_dispatch` / label `knowledge-e2e` | `pnpm e2e:knowledge-api` |

## Indexing

Sources: `docs/**/*.md` (except path segment `templates/`, e.g. `docs/standards/templates/`), `tasks/lessons.md`, `**/AGENTS.md`, virtual registry docs, and ODL skills from [Waiviogit/skills](https://github.com/Waiviogit/skills) (`odl/<name>/SKILL.md`). Frontmatter `type` must be one of `spec`, `skill`, `playbook`, `reference`, `overview`, `adr`, `lesson`, `agents`, `registry`. Invalid type fails `pnpm knowledge:reindex` and `pnpm check:agent-docs`.

Docs reindex never deletes `odl/` rows. Skills are reindexed separately (`reindexSkills`) when the `master` commit sha changes.

### Production / staging (Docker)

The image bundles a staged knowledge workspace (`docs/`, `tasks/lessons.md`, `AGENTS.md` files) plus a skills snapshot (`vendor/skills` + `SKILLS_SHA`). On startup:

1. If `knowledge_files` is **empty** — **sync reindex before HTTP listen** (cold start): docs from the image, skills from the snapshot (no GitHub).
2. If index is **warm** — **async docs reindex** after listen, throttled via Redis (`last-at` + lock, default min interval **5 min**). Skills refresh is a separate tick: GitHub head-sha with `If-None-Match`, download by sha only when it changed.
3. GitHub failures keep the current skills index (no rollback to the snapshot).

Env (see table below): `KNOWLEDGE_STARTUP_REINDEX=true`, `REDIS_URI`, `KNOWLEDGE_WORKSPACE_ROOT=/app` (set in Dockerfile).

Health: `GET /knowledge/health` → `{ status, index: { fileCount, ready } }`.

### Local dev

`KNOWLEDGE_STARTUP_REINDEX` defaults to **false**. Run reindex manually after doc edits:

```bash
pnpm sync:odl-skills
pnpm knowledge:reindex
pnpm nx serve knowledge-api
```

CLI reindex writes `docs/agent-routes.json` (skills + overviews catalog). Startup reindex in Docker skips that file (`KNOWLEDGE_WRITE_AGENT_ROUTES=false`).

### CI / E2E fallback

```bash
pnpm migrate && pnpm knowledge:reindex && pnpm nx e2e knowledge-api-e2e
```

Optional migrator one-shot (same script as local):

```bash
docker compose -p apps run --rm migrator pnpm exec tsx --tsconfig tsconfig.base.json scripts/knowledge-reindex.ts
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `7400` | HTTP port |
| `POSTGRES_*` | — | Postgres connection |
| `REDIS_URI` | `redis://localhost:6379` | Required when startup reindex enabled |
| `KNOWLEDGE_WORKSPACE_ROOT` | `process.cwd()` | Repo root with markdown sources (`/app` in Docker) |
| `KNOWLEDGE_STARTUP_REINDEX` | `false` | `true` in Docker / staging / production compose |
| `KNOWLEDGE_REINDEX_MIN_INTERVAL_SEC` | `300` | Warm reindex throttle |
| `KNOWLEDGE_REINDEX_LOCK_TTL_SEC` | `600` | Distributed reindex lock TTL |
| `KNOWLEDGE_WRITE_AGENT_ROUTES` | `false` | Write `docs/agent-routes.json` on startup reindex |
| `KNOWLEDGE_ALLOW_REINDEX` | `false` | Enable MCP `reindex` tool (dev only) |
| `KNOWLEDGE_SKILLS_REMOTE_ENABLED` | `false` | `true` in Docker — periodic skills refresh from GitHub |
| `KNOWLEDGE_SKILLS_REPO` | `Waiviogit/skills` | GitHub `owner/name` |
| `KNOWLEDGE_SKILLS_BRANCH` | `master` | Branch for head-sha checks |
| `KNOWLEDGE_SKILLS_SNAPSHOT_DIR` | `<workspace>/vendor/skills` | Cold-start snapshot |
| `KNOWLEDGE_SKILLS_REFRESH_INTERVAL_SEC` | `300` | Skills tick interval (minimum 60 seconds) |
| `KNOWLEDGE_GITHUB_TOKEN` | — | Optional; never logged; raises GitHub API rate limit |

## Cursor MCP config

```json
{
  "mcpServers": {
    "odl-knowledge": {
      "url": "http://localhost:7400/knowledge/mcp"
    }
  }
}
```

## Verification

```bash
pnpm check:agent-docs
pnpm nx test knowledge
pnpm nx test knowledge-api
pnpm e2e:knowledge-api
```

## E2E verification

MCP skill discovery is covered by `apps/knowledge-api-e2e` (real HTTP, no transport mocks).

**Indexed paths used by E2E** (assert by `file_path`, not title):

| Scenario | Expected path |
|----------|---------------|
| Knowledge API routing | `odl/knowledge-api-routing/SKILL.md` |
| Hive account signup | `odl/hive-account-signup/SKILL.md` |
| Agent workspace (sidecar / clone) | `odl/setup-workspace/SKILL.md` |
| Build a web project (default: waivio-pages-starter → GitHub Pages) | `odl/build-tenant-site/SKILL.md` |
| Local dev environment | `docs/getting-started.md` |
| App spec (chain-indexer) | `docs/apps/chain-indexer/spec/vote-ingestion.md` |

Unit tests: `pnpm nx test knowledge`. Full MCP E2E: nightly workflow `.github/workflows/knowledge-e2e.yml`.
