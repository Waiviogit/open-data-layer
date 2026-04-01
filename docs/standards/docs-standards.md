# Documentation standards

How we structure and maintain documentation in this repository.

## Document types

| File | Purpose |
|------|---------|
| `README.md` | Entry point + links |
| `developer-guide.md` | Run, setup, ops for developers |
| `architecture.md` / `overview.md` | Internal design and boundaries |
| `spec-index` / `docs/spec/README.md` | Entry point for system spec |
| `overview.md` (under app spec) | What the app does |
| `domain-model.md` | Entities and invariants (when added) |
| `use-cases.md` | Flows and behavior (when added) |
| `api-contracts.md` | External/system contracts (when added) |
| `states-and-transitions.md` | Lifecycle/state machines (when added) |
| `glossary.md` | Canonical terms (when added) |

## Writing rules

- One topic → one canonical file.
- Use headings with stable names.
- Cross-link instead of duplicating.
- Prefer explicit sections over prose.
- Update docs when behavior changes.
- Mark unknowns and TODOs explicitly.
- Do not describe generated Markdown under `generated/` as source of truth — code registries are.

## Principles

1. Small files.
2. Stable headings.
3. Predictable sections.
4. Explicit cross-links.
5. Minimal filler.
6. Canonical terminology.
7. Clear separation of **what**, **why**, and **how**.
8. Do not bury important constraints in prose.

## Agent expectations

- If you implement a feature and find no spec → add or extend a spec in `docs/spec/` or `docs/apps/<app>/spec/`.
- If a spec exists and code diverges → update the spec or mark divergence explicitly (e.g. `> **TODO: spec–code divergence**`).
- If you regenerate reference docs from registries, treat the **code** as source of truth; generated output is illustrative.

## Related

- [Documentation index](../README.md)
- [AGENTS.md](../../AGENTS.md) — agent rules including project documentation
