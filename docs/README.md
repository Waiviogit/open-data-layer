# Documentation

Entry point for Open Data Layer documentation.

## Quick links

| Doc | Description |
|-----|-------------|
| [Getting started](getting-started.md) | Local setup, migrations, run apps |
| [Architecture overview](architecture/overview.md) | Four-service model, contracts |
| [Specification index](spec/README.md) | Domain specs, data model, governance |
| [Documentation standards](standards/docs-standards.md) | How we write docs |
| [Migrations](operations/migrations.md) | Kysely migrator, CLI, snapshots |
| [Portainer (VPS deploy)](deployment/portainer.md) | Docker UI (localhost-only); optional manual `apps` updates alongside stack-watchdog |

## Apps

| App | Entry |
|-----|-------|
| `chain-indexer` | [README](apps/chain-indexer/README.md) · [Developer guide](apps/chain-indexer/developer-guide.md) · [Spec](apps/chain-indexer/spec/overview.md) |
| `ipfs-gateway` | [README](apps/ipfs-gateway/README.md) |
| `query-api` | [README](apps/query-api/README.md) |
| `auth-api` | [Overview](apps/auth-api/overview.md) |
| `notifications` | [Overview](apps/notifications/overview.md) |
| `scheduler` | [Spec](apps/scheduler/spec/overview.md) |
| `stack-watchdog` | [Spec](apps/stack-watchdog/spec/overview.md) |
| `web` | [README](apps/web/README.md) |

## Libraries (cross-cutting)

| Doc | Description |
|-----|-------------|
| [Objects domain](spec/objects-domain.md) | ResolvedView assembly, `ObjectViewService`, repositories |
