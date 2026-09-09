---
title: Create skill object
description: Agent playbook for ODL skill — agent instructions on chain (name, description, skillContent, metadata, references). Use when capturing or improving agent workflows as ODL objects, not repo-only playbooks.
type: playbook
status: active
scope: platform
tags: [object-create, object-create-playbook, skill, agent]
related:
  - docs/skills/object-content-standards.md
  - docs/spec/skill-object.md
---

# Create skill object

Agent skill stored as an ODL object (Agent Skills shape: frontmatter fields + markdown body).

## When to use / not

- **Use** when the deliverable is a reusable agent workflow published on chain (`object_type: skill`).
- **Use** when the user wants to create, edit, or improve skill triggering (`description`) and instructions (`skillContent`).
- **Not** for static site pages — use `page` (`pageContent`).
- **Not** for raw HTML embeds — use `html`.
- **Not** for repo-only playbooks under `docs/skills/` — those are knowledge-api files, not ODL objects.

## Product baseline fields

`name`, `description`, `image`, `skillContent` (product policy via `get_object_create_playbook.required_updates`).

## Field semantics

| Update | Semantics |
|--------|-----------|
| `name` | Skill identifier and display title; prefer kebab-style object id prefix |
| `description` | **Primary trigger text** — what the skill does and when to use it (slightly pushy; all “when to use” belongs here, not in `skillContent`) |
| `skillContent` | Markdown body — how to execute the workflow (imperative, explain why, keep lean; under ~500 lines ideal); large body → IPFS `batch_import` when `requiresIpfsBatch` |
| `license` | License **name** only (text), not a file reference |
| `compatibility` | Optional env requirements (products, packages, network); max 500 chars |
| `metadata` | One `{ key, value }` update per entry; query-api folds rows into one object |
| `allowedTools` | One text row per allowed tool or pattern (MCP / workspace tools) |
| `references` | Object refs to supporting ODL objects (`page`, `skill`, `list`, …) — load when `skillContent` says to `resolve_object` |
| `parent` | Optional hierarchy parent |
| `website` | Optional canonical URL if mirrored off-chain |

### Mapping from SKILL.md folders (Anthropic-style)

| Off-chain skill layout | ODL |
|------------------------|-----|
| YAML `name` | `name` |
| YAML `description` | `description` |
| YAML `license` | `license` |
| YAML `compatibility` | `compatibility` |
| YAML `metadata` | `metadata` (one update per key) |
| YAML `allowed-tools` | `allowedTools` |
| `SKILL.md` body | `skillContent` |
| `references/` files | `references` (object refs, not paths) |
| `scripts/` / `assets/` | Publish as separate objects or IPFS; link via `references` |

## Categories and tags (soft)

Omit unless classifying the skill in discover.

## Locales

Translate `name`, `description`, and `skillContent` per [object content standards](../object-content-standards.md). Keep `license`, `compatibility`, `metadata` keys, `allowedTools`, and `references` stable across locales.

## Research and source hierarchy

1. User intent from the current conversation (workflow, corrections, I/O formats).
2. `search` / `resolve_object` for similar skills on chain.
3. Knowledge-api docs for ODL conventions — not Anthropic `eval-viewer` or `package_skill.py`.

## Images

Optional avatar via IPFS per [object content standards](../object-content-standards.md).

## Special constraints

- **Progressive disclosure:** cheap context = `name` + `description`; full instructions = `skillContent`; deep refs = `references` only when the body says so.
- **No surprise:** `skillContent` must match what `description` promises; no malware, exploits, or exfiltration.
- **No bundled filesystem on chain** — do not paste `scripts/` trees into `skillContent`.
- **`references`** must be real `object_id` values that exist (or will be created in the same batch).

## ODL create loop

1. **Capture intent** — what the skill enables, trigger phrases, expected output format.
2. **Interview** — edge cases, success criteria, required tools; confirm before broadcast.
3. **Draft `description` first** (trigger), then **`skillContent`** (how).
4. Fill optional `license`, `compatibility`, `metadata`, `allowedTools`, `references`.
5. **Broadcast** `object_create` with product baseline fields.
6. **Verify** `resolve_object`: `fields.name`, `fields.description`, `fields.skillContent`; `fields.metadata` is an object when rows exist; `fields.references` expanded.
7. **Iterate** via `update_create` on weak fields (especially `description` triggering copy). Skip formal eval harness unless the user asks.

### Description optimization (manual)

Rewrite `description` with concrete should-trigger / should-not-trigger examples in prose. Do not run automated description loops — improve with the user in chat.

## Verification

`resolve_object`:

- `object_type` = `skill`
- `fields.skillContent` present
- `fields.metadata` is a plain object (not an array) when metadata updates exist
- `fields.allowedTools` is `string[]` when set

## Related workflows

- [page](page.md) · [list](list.md)
- [Object content standards](../object-content-standards.md)
- [Skill object spec](../../spec/skill-object.md)
