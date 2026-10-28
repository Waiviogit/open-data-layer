---
id: docs-spec-osl-encryption-future
title: OSL message encryption
description: Client-side Hive memo encryption for DM, group, and object channels.
type: spec
status: active
scope: platform
tags: [osl, messaging, encryption]
related:
  - docs/spec/osl/messages.md
  - docs/spec/data-model/messages.md
---

# OSL message encryption (v1)

Client-side encryption using Hive **memo** keys. Ciphertext is public on chain and in Postgres; confidentiality depends on memo private keys held by clients (Keychain in web v1).

## Modes

| Mode | Sender can decrypt | Recipient decrypt |
|------|-------------------|-------------------|
| `memo` | Yes (Keychain memo key) | Yes (Keychain memo key) |
| `ephemeral` | **No** (one-way) | Yes (Keychain memo key) |

Ephemeral mode uses a discarded ephemeral private key (`encryptEphemeralOneWay` in `@opden-data-layer/hive-memo-crypto`). Posting-key encrypt paths are forbidden — they would break the one-way guarantee.

## On-chain payload (`message_create`)

Plaintext and encrypted payloads are mutually exclusive:

```json
{
  "channel_id": "grp-abc",
  "encrypted_body": "#5HQ7...",
  "encryption": { "v": 1, "mode": "memo", "to": "bob" }
}
```

| Field | Purpose |
|-------|---------|
| `encrypted_body` | Hive memo ciphertext (`#` + base58) |
| `encryption.v` | Format version (`1`) |
| `encryption.mode` | `memo` or `ephemeral` |
| `encryption.to` | Intended recipient Hive account |

Invariants:

- `body` is plaintext only; encrypted messages have `body` omitted.
- `encrypted_body` and `encryption` are pairwise required.
- Server/indexer **never** decrypts.

## UX rules (web)

- **Plain send:** disclaimer modal on every send until user checks “don't show again”.
- **Encrypted send:** recipient required (DM peer / group member); ephemeral fallback only after explicit consent when sender has no memo key in Keychain. **Not supported on object channels** (indexer warn-skip).
- **Encrypted send (HiveSigner / HiveAuth):** one-way ephemeral only; never probe or call Keychain encode APIs.
- **Decrypt:** Keychain login only. Recipient may decrypt when `encryption.to === viewer`. Memo-mode sender may also decrypt when `author === viewer`. Ephemeral sender never. Everyone else → “not for you” without calling Keychain. HiveSigner / HiveAuth → informative modal only (no Keychain popup). Keychain decode failure after a permitted attempt → generic decrypt error.
- Decrypted plaintext lives in client session cache only.

## Shared crypto lib

`@opden-data-layer/hive-memo-crypto` — memo encrypt/decrypt for agent-wallet MCP tools. See skill `osl-messaging`.

## Future (out of v1)

- Multi-recipient single message (`encryption_meta JSONB` placeholder)
- `overflow_ref` / IPFS for large encrypted payloads
- HiveSigner / HiveAuth decrypt paths
