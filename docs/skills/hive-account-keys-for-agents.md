---
id: docs-skills-hive-account-keys-for-agents
title: Hive account keys for agents
description: Generate a Hive master password and four private/public key pairs for a free account name via agent-wallet MCP. Save the full object. Does not create the on-chain account.
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

Issue a **master password** and **owner / active / posting / memo** pairs — private WIF and `STM` public for each role — for a Hive name that is not yet taken. agent-wallet checks live `get_accounts`, then derives keys locally.

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

Success body — save this object whole. Each role has **both** sides:

```json
{
  "account": "fesmo.agent",
  "masterPassword": "<secret>",
  "keys": {
    "owner": { "private": "5…", "public": "STM…" },
    "active": { "private": "5…", "public": "STM…" },
    "posting": { "private": "5…", "public": "STM…" },
    "memo": { "private": "5…", "public": "STM…" }
  }
}
```

The local file needs both sides. A private-only file is incomplete. Do not `jq` down to `.private`. Do not put publics in a second file. Handing the keys to a creator is the opposite — [public keys only](#hand-off-for-account-creation).

1. Confirm the desired name with the user.
2. Call the tool. Invalid grammar → error, no RPC. Taken name → `Hive account already exists: <name>`.
3. Persist **master password + 4 private + 4 public** in one place.

### User named a path

Write that JSON unchanged. One file. Mode `600`. Do not print the master password or private keys in chat or the terminal.

Before you say done, the check must exit 0:

```bash
jq -e '
  (
    [
      .masterPassword,
      .keys.owner.private, .keys.owner.public,
      .keys.active.private, .keys.active.public,
      .keys.posting.private, .keys.posting.public,
      .keys.memo.private, .keys.memo.public
    ] | all(type == "string" and length > 0)
  ) and ([.keys[].public] | all(startswith("STM")))
' /path/to/<account>-keys.json
```

If this fails, rewrite **the same file** from the tool result you already have. Do not generate a new password unless the user asks — a new call replaces the keys they may already have copied.

### Chat (no path)

Deliver once. Same fields as the JSON, including every public key:

```text
=== HIVE ACCOUNT CREDENTIALS — SAVE OFFLINE NOW ===
Username: <account>
Master password: <masterPassword>
Owner private key: <keys.owner.private>
Owner public key: <keys.owner.public>
Active private key: <keys.active.private>
Active public key: <keys.active.public>
Posting private key: <keys.posting.private>
Posting public key: <keys.posting.public>
Memo private key: <keys.memo.private>
Memo public key: <keys.memo.public>
=== END — delete this chat message after saving ===
```

Wait for explicit **saved**.

4. A path the user named is the delivery. Do not also copy the values into agent memory, the repo, `.env`, or `accounts.json` unless they later ask to import.
5. Do not broadcast. The name is still free. Next step is a creator / `account_create` or a public provider — [hive-account-signup.md](hive-account-signup.md). That hand-off is public keys only.

## Hand-off for account creation

`account_create` / `create_claimed_account` put the new account's **public** keys in `owner`, `active`, `posting`, and `memo_key`. The creator signs with their own key. They never need the new account's WIFs or master password.

When you create the account, or pass material to a person, provider, form, API, or another agent so they can create it, send only:

```text
Username: <account>
Owner public key: <keys.owner.public>
Active public key: <keys.active.public>
Posting public key: <keys.posting.public>
Memo public key: <keys.memo.public>
```

Do not include `masterPassword`, any `.private`, or a WIF in that message, op, metadata, or ticket. Private keys stay in the user's `600` file (or the one-time chat delivery above). Import into `accounts.json` is a separate, explicit user request — still not part of account creation.

## Verification

```bash
pnpm nx test agent-wallet --testPathPatterns=hive-account-generate
```
