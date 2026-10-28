---
id: docs-apps-agent-wallet-spec-hive-account-keys
title: Hive account key generation
description: MCP tool that checks a Hive name is free and returns a master password plus owner/active/posting/memo keys.
type: spec
status: active
scope: agent-wallet
tags: [agent-wallet, hive, keys, account]
updated_at: 2026-10-20
related:
  - docs/apps/agent-wallet/spec/overview.md
---

# Hive account key generation

MCP tool `hive_generate_account_keys` issues **local key material** for a name that is not yet on Hive. It does **not** broadcast `account_create` and does **not** write `~/.odl/accounts.json`.

Agent playbook: skill `hive-account-keys-for-agents` (`npx skills add https://github.com/Waiviogit/skills`).

## Behavior

1. Normalize the name (`trim`, strip leading `@`, lowercase).
2. Reject if the name fails Hive grammar (`isHiveAccountName` in `@opden-data-layer/hive-account`) — no RPC.
3. `HiveChainContextService.getAccount` (`get_accounts` on `HIVE_RPC_NODES`). A row → `Hive account already exists: <name>`. RPC errors propagate.
4. `suggestMasterPassword()` then `deriveAccountKeys(name, password)` — four roles, public prefix `STM`.

Returns `{ account, masterPassword, keys }`. `keys` is `owner` / `active` / `posting` / `memo`, each `{ private, public }` (`public` prefix `STM`). The value exists only in the tool response. A local save is that object — both sides, one file. `account_create` and any creator hand-off take only the four public keys. Procedure: skill `hive-account-keys-for-agents`.

## Verification

```bash
pnpm nx test agent-wallet --testPathPatterns=hive-account-generate
pnpm nx test agent-wallet --testPathPatterns=hive-account
```

## Code

| Path | Role |
|------|------|
| `apps/agent-wallet/src/domain/hive-account-generate.service.ts` | Validate, lookup, derive |
| `apps/agent-wallet/src/mcp/register-agent-wallet-tools.ts` | `hive_generate_account_keys` |
| `libs/hive-account/src/` | Password + key math, name grammar |
