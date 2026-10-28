---
id: docs-standards-docs-standards
title: Documentation standards
type: spec
status: active
scope: platform
tags: [platform, standards]
updated_at: 2026-06-10
related:
  - docs/README.md
  - docs/getting-started.md
---

# Documentation standards

How we structure and maintain documentation in this repository.

## Document types

| File | Purpose |
|------|---------|
| `README.md` | Entry point + links |
| `developer-guide.md` | Run, setup, ops for developers |
| `architecture.md` / `overview.md` | Internal design and boundaries |
| `docs/spec/README.md` | Entry point for system spec |
| `overview.md` (under app spec) | What the app does — slim; links to feature specs |
| `<feature>.md` (under app spec) | One feature per file (e.g. `i18n.md`, `auth.md`) |
| `domain-model.md` | Entities and invariants (when added) |
| `use-cases.md` | Flows and behavior (when added) |
| `api-contracts.md` | External/system contracts (when added) |
| `states-and-transitions.md` | Lifecycle/state machines (when added) |
| `glossary.md` | Canonical terms (when added) |

## Directory layout

```
docs/
  README.md                              master index
  getting-started.md                     local dev setup
  architecture/
    overview.md                          four-service model
    adr/                                 architecture decision records
  standards/
    docs-standards.md                    this file
    testing-rules.md                     agent testing rules (contracts, invariants, quality gate)
  spec/
    README.md                            spec index
    <topic>.md                           cross-cutting domain specs
    data-model/                          PostgreSQL schema, flows, row types
  apps/<app>/
    README.md                            app entry point + links
    developer-guide.md                   run, env, operations (when needed)
    spec/
      overview.md                        slim: what the app does + feature index
      <feature>.md                       cross-cutting feature (not tied to one URL tree)
      pages/
        index.md                         site map: all route areas
        <area>/
          page.md | page-shell.md        hub: layout, URLs, data loading, regions
          data-loading.md                optional: fetch/resolve for the area
          routes/<segment>.md            tab or child route (even when one page.tsx)
      components/                        shared UI specs (optional)
  operations/
    migrations.md                        Kysely migrations, CLI, snapshots
```

## Writing rules

- One topic -> one canonical file.
- Use headings with stable names (never rename without updating cross-links).
- Cross-link instead of duplicating.
- Prefer explicit sections and tables over prose.
- Update docs when behavior changes (same PR).
- Mark unknowns and TODOs explicitly: `> **TODO:** description`.
- Do not describe generated Markdown under `generated/` as source of truth — code registries are.

## File size and splitting rules

- **`overview.md`** must stay slim: purpose, scope/stack, feature index table, verification commands. No feature detail.
- When a feature grows beyond a few paragraphs -> extract to its own `<feature>.md` under the same `spec/` folder.
- Add a row to the overview's "Feature specs" table when creating a new feature file.
- One file should cover one cohesive topic. If a file exceeds ~150 lines or covers two unrelated topics -> split.
- Prefer many small files over few large files.

## Principles

1. Small files.
2. Stable headings.
3. Predictable sections.
4. Explicit cross-links.
5. Minimal filler.
6. Canonical terminology.
7. Clear separation of **what**, **why**, and **how**.
8. Do not bury important constraints in prose.

## Page specs vs feature specs (web and similar frontends)

Use **two layers** under `docs/apps/<app>/spec/` so agents can rebuild UI from MCP search:

| Layer | Location | When to use |
|-------|----------|-------------|
| **Page specs** | `pages/` | One **URL tree** (route area): layout shell, tabs, page-specific data loading |
| **Feature specs** | `spec/*.md` (root) | Cross-cutting behavior shared across pages (auth, SEO, feed, shared components) |
| **Component specs** | `components/` | Reusable UI not owned by a single route area |

**Page area layout:**

- `pages/index.md` — site map table (Route → hub spec → module).
- `pages/<area>/page-shell.md` or `page.md` — public URLs, App Router layouts, persistent regions.
- `pages/<area>/data-loading.md` — optional; server fetch / resolve for the shell.
- `pages/<area>/routes/<segment>.md` — one tab or child segment (even if code uses a single `page.tsx` + query).

**Do not** put route-specific docs only in the spec root (e.g. `discover.md` next to `auth.md`) when the area has a `pages/<area>/` hub — the hub is canonical.

**Frontmatter for pages:**

- Hub: `tags: [<app>, page, <area>]`; `related` includes `pages/index.md`.
- Route file: `related` includes the area hub + `pages/index.md`.
- On move: leave a **stub** at the old path (`status: deprecated`, `related` → canonical path, one-line pointer).

**Agent expectations (pages):**

- Adding a new top-level route → row in `pages/index.md` + hub or route spec under `pages/`.
- `overview.md` stays slim: link `pages/index.md` for routes; list cross-cutting features only.

## Spec file structure (recommended sections)

A typical feature spec file should use these sections (skip what does not apply):

1. **Title** — feature name.
2. **Back/Related links** — navigation.
3. **Purpose / normative goals** — what and why.
4. **Module layout** — code structure and layering.
5. **Behavior** — resolution logic, state transitions, data flow.
6. **Verification** — commands, test expectations.
7. **Architecture diagram** — mermaid when helpful.
8. **Related code paths** — table of files and roles.

## Frontmatter (YAML)

Indexed Markdown (`docs/**`, `tasks/lessons.md`, `**/AGENTS.md`, plus skills from [Waiviogit/skills](https://github.com/Waiviogit/skills) as `odl/**`) may include an optional YAML block at the top. Prefer explicit frontmatter for `tags` and `related`; when frontmatter is omitted, metadata is inferred from the file path at reindex time.

```yaml
---
id: docs-apps-chain-indexer-spec-hive-ingestion
title: Hive ingestion
type: spec
status: active
scope: chain-indexer
tags: [chain-indexer, hive-ingestion]
updated_at: 2026-06-10
related:
  - docs/apps/chain-indexer/spec/overview.md
---
```

**`id` convention:** slug from repo-relative path (lowercase, `/` → `-`), e.g. `docs/apps/chain-indexer/spec/hive-ingestion.md` → `docs-apps-chain-indexer-spec-hive-ingestion`. Omit `id` to use the same default at reindex time.

| Field | Required | Values / notes |
|-------|----------|----------------|
| `id` | no | Slug from relative path (see example above); used for MCP `get_file` and dedup |
| `title` | no | Defaults to first `#` heading or path slug |
| `description` | no | One-line purpose for agents (≤500 chars); shown in `list_files` / `get_file`; boosts FTS. If omitted, first body line after `#` title is used at reindex |
| `type` | no | `spec`, `skill`, `overview`, `adr`, `lesson`, `agents`, `registry` |
| `status` | no | `active` (default), `draft`, `deprecated` |
| `scope` | no | App name (`chain-indexer`, `web`, …) or `platform` |
| `tags` | no | String array for FTS boosts |
| `owner` | no | Team or individual |
| `updated_at` | no | ISO date |
| `related` | no | Paths to related docs |

**Path inference** (when frontmatter is empty):

| Path pattern | `type` | `scope` |
|--------------|--------|---------|
| `docs/README.md` | `overview` | `platform` |
| `docs/getting-started.md` | `overview` | `platform` |
| `docs/architecture/overview.md` | `overview` | `platform` |
| `docs/standards/docs-standards.md` | `spec` | `platform` |
| `docs/spec/*` | `spec` | `platform` |
| `docs/operations/*` | `spec` | `platform` |
| `docs/deployment/*` | `spec` | `platform` |
| `docs/apps/<app>/overview.md` | `overview` | `<app>` |
| `docs/apps/<app>/README.md` | `overview` | `<app>` |
| `docs/apps/<app>/developer-guide.md` | `spec` | `<app>` |
| `docs/apps/<app>/spec/overview.md` | `overview` | `<app>` |
| `docs/apps/<app>/spec/*` | `spec` | `<app>` |
| `docs/architecture/adr/*` | `adr` | `platform` |
| `odl/<name>/SKILL.md` | `skill` | `platform` |
| `odl/object-create/references/<kebab>.md` (registry type) | `playbook` | `platform` |
| other `odl/**/references/*.md` | `reference` | `platform` |
| `tasks/lessons.md` | `lesson` | `platform` |
| `**/AGENTS.md` | `agents` | app or `platform` |

Reindex after doc changes: `pnpm knowledge:reindex` (local dev). Deployed **knowledge-api** picks up doc changes on pod restart (startup reindex, Redis-throttled ≤5 min on warm index). See [knowledge-api overview](../apps/knowledge-api/spec/overview.md).

## Skill files ([Waiviogit/skills](https://github.com/Waiviogit/skills))

Domain procedural playbooks for agents live in a separate catalog. **Not** the same as `.agents/skills/` — that folder is Cursor runtime tooling (Next.js, Nx).

Install:

```bash
npx skills add https://github.com/Waiviogit/skills
```

knowledge-api indexes `odl/<name>/SKILL.md` as `skill` and registry-mapped `odl/object-create/references/<kebab>.md` as `playbook`. Authoring rules: [skills AGENTS.md](https://github.com/Waiviogit/skills/blob/master/AGENTS.md).

**CI:** `pnpm sync:odl-skills` then `pnpm check:agent-docs` and `pnpm check:object-create-playbooks` (every `OBJECT_TYPE_REGISTRY` key has a kebab playbook file).

### Environment setup (two docs)

Do not mix these into one doc — agents search by intent and must land on the right target:

| Doc | Indexed path | Use when |
|-----|--------------|----------|
| setup-workspace skill | `odl/setup-workspace/SKILL.md` | Sidecar agent without checkout; clone repo; resolve spec paths to source |
| [Getting started](../getting-started.md) | `docs/getting-started.md` | Local dev: Docker, migrations, `pnpm nx serve` |

## Agent expectations

- New docs should include frontmatter when metadata is not obvious from the path.
- New domain procedures belong in [Waiviogit/skills](https://github.com/Waiviogit/skills) (not `.agents/skills/`).
- If you implement a feature and find no spec -> add a spec in `docs/spec/` or `docs/apps/<app>/spec/`.
- If a spec exists and code diverges -> update the spec or mark divergence: `> **TODO: spec-code divergence**`.
- If you regenerate reference docs from registries, treat the **code** as source of truth; generated output is illustrative.
- When adding a new feature spec for an app, create `docs/apps/<app>/spec/<feature>.md` and add a row to `docs/apps/<app>/spec/overview.md` "Feature specs" table.
- Keep `overview.md` slim — never put feature detail there; link to feature files instead.
- When changing behavior, update the corresponding doc in the same PR.
- Use relative Markdown links for cross-references; link to the canonical file, do not copy content.

## Related

- [Documentation index](../README.md)
- [Testing rules](testing-rules.md)
- [AGENTS.md](../../AGENTS.md) — agent rules including project documentation
