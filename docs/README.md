---
id: docs-readme
title: Documentation
description: Entry point for Open Data Layer documentation, specs, and agent playbooks.
type: overview
status: active
scope: platform
tags: [platform, onboarding]
updated_at: 2026-06-11
related:
  - docs/getting-started.md
  - docs/standards/docs-standards.md
  - docs/standards/testing-rules.md
---

# Documentation

Entry point for Open Data Layer documentation.

## For agents (first visit)

1. Install ODL skills: `npx skills add https://github.com/Waiviogit/skills`.
2. Connect to **knowledge-api** MCP — read server `instructions` on `initialize` (fallback when local skills are missing).
3. Open `odl/knowledge-api-routing/SKILL.md` or `get_file` that path.
4. `list_files({ type: "skill" })` — catalog playbooks with `description` one-liners.
5. `get_context({ topic: "<task>" })` before implementing.
6. `.agents/skills/` is **not** indexed — ODL playbooks live in [Waiviogit/skills](https://github.com/Waiviogit/skills).

## Quick links

| Doc | Description |
|-----|-------------|
| [Getting started](getting-started.md) | Local setup, migrations, run apps |
| [Architecture overview](architecture/overview.md) | Four-service model, contracts |
| [Specification index](spec/README.md) | Domain specs, data model, governance |
| [Documentation standards](standards/docs-standards.md) | How we write docs |
| [Testing rules](standards/testing-rules.md) | Agent rules for writing tests |
| [ODL skills](https://github.com/Waiviogit/skills) | Agent playbooks (`npx skills add https://github.com/Waiviogit/skills`) |
| [Migrations](operations/migrations.md) | Kysely migrator, CLI, snapshots |
| [Portainer (VPS deploy)](deployment/portainer.md) | Docker UI (localhost-only); optional manual `apps` updates alongside stack-watchdog |

## Apps

| App | Entry |
|-----|-------|
| `chain-indexer` | [README](apps/chain-indexer/README.md) · [Developer guide](apps/chain-indexer/developer-guide.md) · [Spec](apps/chain-indexer/spec/overview.md) |
| `ipfs-gateway` | [README](apps/ipfs-gateway/README.md) |
| `query-api` | [README](apps/query-api/README.md) · [Spec](apps/query-api/spec/overview.md) |
| `knowledge-api` | [Spec](apps/knowledge-api/spec/overview.md) |
| `auth-api` | [Overview](apps/auth-api/overview.md) |
| `notifications` | [Overview](apps/notifications/overview.md) |
| `scheduler` | [Spec](apps/scheduler/spec/overview.md) |
| `stack-watchdog` | [Spec](apps/stack-watchdog/spec/overview.md) |
| `web` | [README](apps/web/README.md) |

## Libraries (cross-cutting)

| Doc | Description |
|-----|-------------|
| [Objects domain](spec/objects-domain.md) | ResolvedView assembly, `ObjectViewService`, repositories |
