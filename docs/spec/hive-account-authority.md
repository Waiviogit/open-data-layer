---
id: docs-spec-hive-account-authority
title: Hive account authority (account_auths)
description: How Hive posting, active, and owner authority delegation works — including nested account_auths recursion, owner→active resolution, and HF28 strict authorities.
type: spec
status: active
scope: platform
tags: [platform, domain, hive, authority]
updated_at: 2026-09-09
related:
  - docs/spec/README.md
  - docs/apps/query-api/spec/user-account-auths-endpoint.md
  - docs/apps/chain-indexer/spec/account-authority-grants.md
  - docs/skills/hive-account-authority-for-agents.md
---

# Hive account authority (account_auths)

**Back:** [Spec index](README.md)

Normative reference for Hive `account_auths` delegation semantics. ODL indexes **direct edges only**; nested authorization is evaluated by Hive consensus at transaction sign time.

## Scope

Each Hive account has three authority objects: **posting**, **active**, and **owner**. Each contains:

- `weight_threshold` — minimum combined weight required
- `key_auths` — `[public_key, weight]` pairs
- `account_auths` — `[account_name, weight]` pairs (delegation to other accounts)

Memo keys are separate; memo has no `account_auths`.

## Nested recursion (HIVE_MAX_SIG_CHECK_DEPTH = 2)

When checking whether a signature satisfies an authority, Hive walks `account_auths` recursively. Maximum depth is **2** (constant `HIVE_MAX_SIG_CHECK_DEPTH` in Hive consensus).

| Chain | Can sign as A? |
| ----- | -------------- |
| `A → B → C` (same authority level) | Yes |
| `A → B → C → D` | No — requires depth 3 |

**Trust implication:** granting authority to account B means trusting not only B's keys, but also B's own `account_auths` tree up to depth 2.

## Which authority level is used for each hop

For **posting** and **active**, recursion stays on the same authority type:

```
A.posting → B.posting → C.posting → C posting key
A.active  → B.active  → C.active  → C active key
```

| A's authority | Entry in A.account_auths | B's authority checked |
| ------------- | ------------------------ | --------------------- |
| `A.posting` | `["B", weight]` | `B.posting` |
| `A.active` | `["B", weight]` | `B.active` |
| `A.owner` | `["B", weight]` | **`B.active`** (not `B.owner`) |

### Owner → active trap

This is the most dangerous non-obvious rule:

Adding account B to `A.owner.account_auths` does **not** mean Hive checks `B.owner`. Hive checks **`B.active`**.

Nested example:

```
A.owner.account_auths = [["B", 1]]
B.active.account_auths  = [["C", 1]]
```

Effective chain:

```
A.owner → B.active → C.active → C active key
```

C's **active** key can satisfy A's **owner** authority (e.g. owner-level `account_update` on A). Hive functional tests cover this explicitly (`bob.owner → carol`, Carol signs with active key).

**Never grant owner authority casually.** You are delegating control of your account's owner authority to the grantee's **active** authority tree.

## HF28 strict authorities

After HF28, Hive uses strict authority matching. Do not rely on legacy cross-level satisfaction:

- Posting operations require **posting** authority (active/owner keys do not auto-satisfy posting).
- Active operations require **active** authority.
- Owner operations require **owner** authority (resolved via active for `account_auths` entries as above).

## What each authority unlocks

| Type | Typical operations | Grant/revoke requires |
| ---- | ------------------ | --------------------- |
| **posting** | Posts, votes, follow, RC delegation, posting `custom_json` | Grantor **active** key (`account_update`) |
| **active** | Transfers, HP delegation, `account_update`, active `custom_json` | Grantor **active** key |
| **owner** | Account recovery, owner-only changes | Grantor **owner** key |

Posting delegation does **not** unlock active operations (HF28).

## ODL storage (direct edges only)

ODL materializes **direct** `(grantor, authority_type, grantee)` edges in `user_account_auths`:

| Component | Role |
| --------- | ---- |
| [chain-indexer account-authority-grants](../apps/chain-indexer/spec/account-authority-grants.md) | Snapshot from `account_update` / `get_accounts` |
| [query-api authority lists](../apps/query-api/spec/user-account-auths-endpoint.md) | Reverse lookup: who granted to whom |

These APIs answer **one hop**: "B delegated posting to C". They do **not** enumerate transitive grantors (e.g. A when only `A → B → C` exists on chain).

Nested signing (`C` signs as `A`) is valid on Hive but invisible to ODL list endpoints. Use live `condenser_api.get_accounts` to inspect full authority trees when assessing trust.

## Related

- [Hive posting authority for agents](../skills/hive-account-authority-for-agents.md) — agent workflows (act-as, grant/revoke)
- [User profile permissions page](../apps/web/spec/pages/user-profile/routes/permissions.md) — web UI for grant management
