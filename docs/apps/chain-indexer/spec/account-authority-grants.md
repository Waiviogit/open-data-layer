---
id: docs-apps-chain-indexer-spec-account-authority-grants
title: Hive account authority grants
description: Index account_update account_auths into user_account_auths for reverse lookup.
type: spec
status: active
scope: chain-indexer
tags: [chain-indexer, hive, authority]
updated_at: 2026-09-11
related:
  - docs/apps/chain-indexer/spec/social-parsers.md
  - docs/apps/query-api/spec/user-account-auths-endpoint.md
  - docs/spec/hive-account-authority.md
---

# Hive account authority grants

**Back:** [chain-indexer overview](../overview.md)

## Purpose

Materialize Hive `account_auths` edges (owner / active / posting only) so query-api can answer who delegated authority to an account. Memo keys are not indexed — memo has no `account_auths` in the Hive protocol. Stores **direct edges only** — nested delegation chains are not flattened; see [hive-account-authority.md](../../../spec/hive-account-authority.md).

## Tables

| Table | Role |
| ----- | ---- |
| `user_account_auths` | Current snapshot: `(grantor, authority_type, grantee)` + `updated_at_block` |
| `user_account_auth_sync` | Backfill / sync checkpoint per account |

## Live ingestion

Handled by `AccountAuthorityService` on:

- `account_update`, `account_update2` — replace only authority types present in the op
- `account_create`, `create_claimed_account` — seed initial authorities for `new_account_name`
- `recover_account` — replace `owner` from `new_owner_authority` only
- `AccountSyncWorker` — full snapshot from `get_accounts` at chain head

Block guard: skip replace when `incomingBlock < max(updated_at_block)` for that grantor+type.

## Code

| Piece | Path |
|-------|------|
| Parse | `apps/chain-indexer/src/domain/hive-social/account-authority.parse.ts` |
| Service | `apps/chain-indexer/src/domain/hive-social/account-authority.service.ts` |
| Repository | `apps/chain-indexer/src/repositories/user-account-auths.repository.ts` |
| Handlers | `apps/chain-indexer/src/domain/hive-parser/hive-operation-handlers.provider.ts` |

## Backfill

`pnpm backfill:user-account-auths` — see script header in `scripts/backfill-user-account-auths.ts`.
