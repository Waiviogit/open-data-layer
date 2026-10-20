---
id: docs-skills-hive-account-signup
title: Hive account signup
description: Guide a user through creating a new Hive blockchain account via public signup providers.
type: skill
status: active
scope: platform
tags: [hive, account, signup, user, register, blockchain, keys, onboarding]
updated_at: 2026-06-10
related:
  - docs/README.md
  - docs/skills/knowledge-api-routing.md
  - docs/skills/setup-workspace.md
  - docs/skills/hive-blockchain-broadcast.md
  - docs/skills/hive-account-keys-for-agents.md
  - docs/standards/docs-standards.md
  - docs/apps/auth-api/spec/challenge-flow.md
---

# Hive account signup

Guide a user through creating a new Hive blockchain account using the best **public provider** for their constraints.

## When to use

- User needs a **new Hive account** (username + keys) for Waivio/ODL apps, Hive signing, or testing.
- User asks to **register a new Hive user** or create a mainnet account from scratch.
- User asks which signup option is free, instant, anonymous, or cheapest.
- Onboarding before [auth-api challenge flow](../apps/auth-api/spec/challenge-flow.md) (user must already have keys).

## When not to use

- User already has an account — help with **wallet import** or login, not signup.
- User wants **password reset** or **username rename** — Hive does not support these; explain key custody instead.
- Task is only about **this repo's local dev** — see [getting-started.md](../getting-started.md).
- User only needs **local key material** for a free name (no on-chain create) — [hive-account-keys-for-agents.md](hive-account-keys-for-agents.md).

## Source of truth (required each run)

**Do not rely on this file alone for provider list or pricing.**

1. Open and read: **https://signup.hive.io/**
2. Parse the **Registration Providers** section (names, price, instant vs delayed, verification, payment methods).
3. Rank options against the user's criteria (free, instant, anonymous, already has HIVE, etc.).
4. If a chosen provider fails or is unavailable, return to signup.hive.io and pick the next best match.

Optional secondary references (provider UX details, not a substitute for signup.hive.io):

- Ecency signup docs: https://docs.ecency.com/signup.html

## Typical providers (verify on page)

Last aligned with signup.hive.io content; **re-fetch before recommending**.

| Provider | Price | Speed | Verification | Notes |
|----------|-------|-------|--------------|-------|
| **InLeo** | Free | Instant | Email / Google / X | Good default for free + instant if user accepts verification |
| **Ecency** | Free (in-app paid ~$2.99 optional) | Instant | Email or crypto wallet | Free tier may have extra checks; paid in-app bypass |
| **Hivedex.io** | ~$1.49 | Instant | Anonymous | Crypto payments (many chains listed on page) |
| **HiveDapps** | Free | **Delayed** | Requires existing community member | No rush, no payment |
| **Actifit** | ~$2 | Instant | No verification | Pay with **HIVE**; user must already hold HIVE |

Hive accounts are **created by another account** and have a cost; providers subsidize or charge differently.

## Decision rules

Apply **after** parsing signup.hive.io for the current run:

1. **Free + accepts verification** → prefer **InLeo** or **Ecency** (email/wallet path per user preference).
2. **Free + no rush** → **HiveDapps** (delayed; needs community member).
3. **Anonymous / no verification / pay with crypto** → **Hivedex.io**.
4. **Already has HIVE + instant + no verification** → **Actifit**.
5. **Provider fails or blocks signup** → re-read signup.hive.io; try next-ranked option; do not invent alternate APIs.
6. **Never invent reset/recovery** → Hive has **no password reset**. Lost keys = lost account unless user saved backups.

### Default fallbacks (if user gives no preference)

| Priority | Provider | Rationale |
|----------|----------|-----------|
| Free general | Ecency or InLeo | Instant, common path |
| Anonymous cheap | Hivedex.io | Paid, minimal KYC |
| Has HIVE | Actifit | HIVE-denominated, instant |

## Agent workflow

### 1. Clarify constraints

Ask (or infer from context):

- Free vs paid OK?
- Instant vs can wait (days)?
- OK with email/social verification?
- Need anonymous signup?
- Already holds HIVE?

### 2. Fetch and rank

```text
GET https://signup.hive.io/  → extract provider cards (name, price, bullets)
```

Build a short ranked list with one-line reason each.

### 3. Confirm username

- Hive usernames: **3–16 characters**, lowercase, rules per provider UI.
- **Confirm spelling with user before final submit** — names cannot be renamed later.

### 4. Choose interaction mode

| Mode | User can save keys in browser? | Agent must |
|------|----------------------------------|------------|
| **Browser** (Cursor browser, user at keyboard) | Yes | Automate only with **gates** — never click past key/password screens until user confirms save |
| **Messenger / chat-only** (Telegram, Slack, no shared browser) | No | **Deliver keys in chat** in a structured block; user copies to a password manager / offline file |

Detect mode before starting the provider flow. If unclear, ask.

### 5. Provider UI — browser mode (mandatory gates)

Open the provider link from signup.hive.io. User may be at the keyboard; agent may assist via browser automation **only** with these rules:

**Forbidden:** clicking Next / Continue / Pay / Finish on any screen that shows **master password**, **seed phrase**, or **private keys** without an explicit user confirmation that they saved the material.

#### Gate A — Master password (or equivalent seed)

When the UI shows the master password / recovery phrase:

1. **Stop automation.** Do not click away or advance.
2. Tell the user: *“Copy the master password (or seed) to your password manager or an offline file now. I will wait.”*
3. Optionally highlight the field or scroll it into view; do **not** submit the form.
4. Proceed **only** after the user replies with an explicit confirmation, e.g. *“saved”*, *“copied”*, *“done”* — not silence, not “continue” alone.
5. If the user cannot save right now → **pause signup**; do not go to payment or account creation.

#### Gate B — Active and posting keys (and owner / memo if shown)

When the UI shows **active**, **posting**, and any other keys:

1. **Stop automation** again before any Next / download / payment step.
2. For each key type visible, ask the user to copy or download:
   - **Posting** — daily use, ODL writes
   - **Active** — transfers, power-ups
   - **Owner** — account recovery (most sensitive)
   - **Memo** — encrypted memos (if shown)
3. Prefer **Download keys** / export file if the provider offers it; otherwise copy field-by-field.
4. Proceed **only** after explicit user confirmation that **all displayed keys are saved** (same bar as Gate A).
5. **Never** skip to payment or “create account” until Gate A **and** Gate B are confirmed.

#### Gate C — Username (before irreversible submit)

- Confirm spelling with the user one more time immediately before the final create / pay action.

#### After gates pass

- Payment or free submit may proceed.
- Re-check: user still has the key export file or password manager entry before closing the tab.

### 6. Provider flow — messenger / chat-only mode

User cannot interact with a browser to save secrets. The agent **must** pass credentials in the chat.

1. Walk the user through provider steps via instructions **or** run browser on agent side and **read back** what appears on screen.
2. When master password / keys are generated, send them in one structured message:

```text
=== HIVE ACCOUNT CREDENTIALS — SAVE OFFLINE NOW ===
Username: alice
Master password: <value>
Posting private key: <value>
Active private key: <value>
Owner private key: <value>   (if shown)
Memo private key: <value>    (if shown)
=== END — delete this chat message after saving ===
```

3. Warn: messenger logs are **not** secure long-term storage; user must copy to a password manager or encrypted offline file, then delete the chat message.
4. Wait for explicit *“saved”* before continuing to payment or declaring signup complete.
5. **Never** store these values in agent memory, repo, or `.env` after the session.

### 7. Key export and storage (both modes)

After creation, ensure user:

- Has **owner**, **active**, **posting**, and **memo** keys (or seed) saved locally — not only in chat history.
- Understands there is **no** “forgot password”.
- Does **not** rely on the agent or messenger as permanent key storage.

Point to signup.hive.io **What's next?** (wallet choice) when appropriate.

### 8. Key custody for later broadcasts

Before any on-chain write, the user must choose how **signing** works for follow-up tasks (see [Hive blockchain broadcast](hive-blockchain-broadcast.md)):

| User choice | Meaning |
|-------------|---------|
| **Wallet signs** | Keys stay in Keychain / HiveAuth / HiveSigner; agent only builds transaction payloads |
| **Payload only** | Agent prints ops/envelope; user signs with their own tool |
| **Session posting key** | User pastes posting key for one automation session (discouraged unless explicitly requested) |

Ask this **after** Gate A/B (or messenger key delivery) is confirmed — not during signup UI. Do not assume the user wants the agent to store keys.

Also ask which **ODL network** they will write to (**mainnet** vs **testnet**) before the first on-chain ODL tx — see [broadcast skill § ODL network](hive-blockchain-broadcast.md#odl-network-mainnet-vs-testnet). Record the choice for the rest of the session.

## Key handling rules (mandatory)

- **Browser automation:** **never** auto-advance past master password or private-key screens; require explicit user *“saved”* at [Gate A and Gate B](#5-provider-ui--browser-mode-mandatory-gates).
- **Messenger / chat-only:** **must** deliver keys in a structured chat block; user must confirm save before payment or completion.
- **Never** store Hive owner/active/posting/memo keys in repo, `.env`, tickets, or agent long-term memory **unless** the user explicitly chose [session posting key mode](hive-blockchain-broadcast.md#key-custody-decide-with-the-user-first) for a bounded task — then clear after use.
- **Never** send keys to unrelated third parties; only the user and the official signup UI.
- Prefer flows where the user **downloads keys locally** (file or wallet export).
- **Warn:** accounts cannot be renamed; keys cannot be reset by Hive.
- **Confirm username** before irreversible creation step.
- **Payment is last:** do not open payment until key custody is confirmed.

## Verification

Signup succeeded when the user can:

- Log in with a supported wallet (Hive Keychain, Ecency, etc.) using the new username, **or**
- Look up the account on a block explorer / `condenser_api.get_accounts` and see the new name.

Agent verification (no keys required):

```bash
# Example: account exists (public RPC; replace USERNAME)
curl -s -X POST https://api.hive.blog -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","method":"condenser_api.get_accounts","params":[["USERNAME"]],"id":1}'
```

Non-empty `result[0].name` matching the chosen username → account created.

## Related

- [Hive account keys for agents](hive-account-keys-for-agents.md) — local master password + four key pairs via agent-wallet
- [Hive blockchain broadcast](hive-blockchain-broadcast.md) — next step: ODL txs after account exists
- [signup.hive.io](https://signup.hive.io/) — live provider list (canonical)
- [Setup agent workspace](setup-workspace.md) — clone repo / GitHub raw for code work
- [auth-api challenge flow](../apps/auth-api/spec/challenge-flow.md) — login after account exists
- [Documentation standards](../standards/docs-standards.md) — skill file conventions
