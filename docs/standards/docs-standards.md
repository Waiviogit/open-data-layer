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
  spec/
    README.md                            spec index
    <topic>.md                           cross-cutting domain specs
    data-model/                          PostgreSQL schema, flows, row types
  apps/<app>/
    README.md                            app entry point + links
    developer-guide.md                   run, env, operations (when needed)
    spec/
      overview.md                        slim: what the app does + feature index
      <feature>.md                       one file per feature
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

## Agent expectations

- If you implement a feature and find no spec -> add a spec in `docs/spec/` or `docs/apps/<app>/spec/`.
- If a spec exists and code diverges -> update the spec or mark divergence: `> **TODO: spec-code divergence**`.
- If you regenerate reference docs from registries, treat the **code** as source of truth; generated output is illustrative.
- When adding a new feature spec for an app, create `docs/apps/<app>/spec/<feature>.md` and add a row to `docs/apps/<app>/spec/overview.md` "Feature specs" table.
- Keep `overview.md` slim — never put feature detail there; link to feature files instead.
- When changing behavior, update the corresponding doc in the same PR.
- Use relative Markdown links for cross-references; link to the canonical file, do not copy content.

## Related

- [Documentation index](../README.md)
- [AGENTS.md](../../AGENTS.md) — agent rules including project documentation
