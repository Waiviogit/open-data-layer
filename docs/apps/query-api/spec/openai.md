---
id: docs-apps-query-api-spec-openai
title: query-api OpenAI client
description: Optional OpenAI chat completions helper used by Instacart recipe ingredient formatting.
type: spec
status: active
scope: query-api
tags: [query-api, openai]
updated_at: 2026-10-22
related:
  - docs/apps/query-api/spec/overview.md
  - docs/apps/query-api/spec/instacart-recipe-link.md
---

# OpenAI client

**Back:** [overview](overview.md) · **Used by:** [Instacart recipe link](instacart-recipe-link.md)

Reusable Nest module at `apps/query-api/src/domain/openai/`. Official [`openai`](https://www.npmjs.com/package/openai) package. No recipe or Instacart knowledge.

## API

`OpenAiJsonClient.promptWithJsonSchema({ prompt, jsonSchema })` calls `chat.completions.create` with `response_format: { type: 'json_schema', json_schema }`.

Returns `{ result }` or `{ error }`. Missing `OPENAI_API_KEY`, timeout, empty completion, or parse failure never throw.

## Env

| Variable | Default |
| -------- | ------- |
| `OPENAI_API_KEY` | unset (skip outbound calls) |
| `OPENAI_MODEL` | `gpt-5.6-luna` |

Request timeout is `CURRENCY_EXTERNAL_REQUEST_TIMEOUT_MS`.
