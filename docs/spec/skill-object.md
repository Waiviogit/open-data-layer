---
id: docs-spec-skill-object
title: Skill object type
description: ODL skill object — Agent Skills-shaped metadata and markdown body on chain.
type: spec
status: active
scope: platform
tags: [platform, domain, object-type, skill]
related:
  - docs/spec/object-type-entity.md
---

# Skill object type

**Back:** [Spec index](README.md) · **Related:** [object-type-entity](object-type-entity.md), playbook `odl/object-create/references/skill.md`

## Purpose

`skill` stores agent instructions on chain in an Agent Skills-compatible shape: trigger metadata in `description`, body in `skillContent`, optional license/compatibility/metadata/tools/references.

## Registry

- **Object type:** `skill` (`OBJECT_TYPES.SKILL`)
- **New update types:** `license`, `compatibility`, `metadata`, `allowedTools`, `references`, `skillContent`

## Field contracts

| Update | kind | cardinality | Notes |
|--------|------|-------------|--------|
| `license` | text | single | License name; max 256 |
| `compatibility` | text | single | Env requirements; max 500 |
| `metadata` | json | multi | Schema `{ key, value }`; **projected as one object** |
| `allowedTools` | text | multi | Tool name or pattern per row |
| `references` | object_ref | multi | No `applies_to` whitelist |
| `skillContent` | text | single | Markdown body; localizable |

## Metadata projection

The indexer stores one row per `{ key, value }` update. Query-api folds VALID rows into `fields.metadata: Record<string, string>` (first ranked row wins per key). No valid rows → field omitted / `null`.

## Host content (web)

Like `page` and `legal_document`, `skill` uses host-content landing: center column renders sanitized `skillContent`. Nested fetch defaults include `skillContent` alongside `pageContent` and `legalText`.

## Create policy

Product baseline: `name`, `description`, `image`, `skillContent`.
