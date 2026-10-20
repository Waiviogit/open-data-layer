---
id: docs-skills-hive-account-keys-for-agents
title: Hive account keys for agents
description: Generate a Hive master password and four key pairs for a free account name via agent-wallet MCP. Does not create the on-chain account.
type: skill
status: active
scope: platform
tags: [hive, account, keys, agent-wallet, mcp, master-password]
updated_at: 2026-10-20
related:
  - docs/skills/hive-account-signup.md
  - docs/skills/hive-has-agent-wallet.md
  - docs/skills/hive-blockchain-broadcast.md
  - docs/skills/knowledge-api-routing.md
  - docs/apps/agent-wallet/spec/hive-account-keys.md
  - docs/apps/agent-wallet/spec/overview.md
---

# Hive account keys for agents

Issue **master password + owner / active / posting / memo** for a Hive name that is not yet taken. agent-wallet checks live `get_accounts`, then derives keys locally.

This does **not** create the account on chain. For a provider-created account, use [hive-account-signup.md](hive-account-signup.md).

## When to use

- Agent must produce key material for a **new** username before a later `account_create` or provider flow.
- User asks to generate a Hive master password and four key pairs for a free name.

## When not to use

- User needs a **live account** now — [hive-account-signup.md](hive-account-signup.md).
- User already has keys and only needs them in `~/.odl/accounts.json` — [multi-account.md](../apps/agent-wallet/spec/multi-account.md).
- Password reset or rename — Hive has neither.

## Tool

`hive_generate_account_keys({ account })`

1. Confirm the desired name with the user.
2. Call the tool. Invalid grammar → error, no RPC. Taken name → `Hive account already exists: <name>`.
3. On success, deliver secrets **once** in a structured block (same shape as [signup messenger delivery](hive-account-signup.md#6-messenger--chat-only-mode)):

```text
=== HIVE ACCOUNT CREDENTIALS — SAVE OFFLINE NOW ===
Username: <account>
Master password: <masterPassword>
Owner private key: <keys.owner.private>
Active private key: <keys.active.private>
Posting private key: <keys.posting.private>
Memo private key: <keys.memo.private>
=== END — delete this chat message after saving ===
```

4. Wait for explicit **saved**. Do not store the values in agent memory, repo, `.env`, or `accounts.json` unless the user later asks to import.
5. Do not broadcast. Next step is a creator/`account_create` or a public provider — not this tool.

## Verification

```bash
pnpm nx test agent-wallet --testPathPatterns=hive-account-generate
```
