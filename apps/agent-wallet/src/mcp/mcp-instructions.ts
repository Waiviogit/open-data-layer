export const AGENT_WALLET_MCP_INSTRUCTIONS = `You are connected over MCP — call these tools directly. Do not shell out to curl, python, or fetch against http://127.0.0.1:7500/agent-wallet/mcp.

Local agent wallet daemon for ODL: multi-account local Hive keys (primary), optional HAS session, per-account Waivio JWT auth, and IPFS image upload.

Default Waivio API origin: https://waiviodev.com (override with WAIVIO_API_ORIGIN).

Workflow (local keys — primary):
1. Configure accounts in ~/.odl/accounts.json (or env fallback: HIVE_ACCOUNT + HIVE_POSTING_KEY). Optional HIVE_ACTIVE_KEY / HIVE_MEMO_KEY per env fallback entry.
2. wallet_accounts lists configured accounts and readiness. wallet_status shows default-account summary plus localAccounts[].
3. waivio_auth_start({ account }) signs the auth challenge locally for that account (no HAS login required when the account is in the local registry).
4. ipfs_upload_image({ filePath, account }) for avatars — prepare 1:1 up to 1024px before upload. Returns { cid, contentUrl, url? }.
5. ipfs_upload_file({ content | filePath, filename?, account }) for ODL envelope JSON when requiresIpfsBatch (max 10 MiB).
6. Build ops (see decision table below). When requiresIpfsBatch: ipfs_upload_file({ content: envelopeJson }) → odl_build_batch_import({ account, cid }) → wallet_broadcast.
7. Otherwise wallet_broadcast({ ops, keyType, account? }) → poll wallet_broadcast_status immediately.
8. After broadcast, verify fields on the object via query-api (resolve_object).

Posting authority (act-as grantor):
- Names in ops = grantor (e.g. flowmaster author); signature = the chosen wallet account posting key (e.g. waivio.import).
- Pre-flight: get_user_authority_grantors({ account: <signer account>, type: "posting" }) — grantor must appear.
- Grant/revoke posting: hive_build_posting_authority_grant → keyType active, signerAccount = grantor. Local: broadcast via wallet_broadcast when canSignLocally is true; else payload. HAS: if wallet identity is the grantor, has_broadcast with keyType active (phone approval); otherwise payload for grantor. Confirm with user before any grant/revoke or value-moving active op.

ODL build decision table:
- NEW object → odl_build_object_create (always includes object_create; check suggestIpfsBatch / perOpBytes when warnings)
- EXISTING object, one field (avatar image, title, description, …) → odl_build_update_create
- EXISTING object, gallery photo → odl_build_gallery_item (pass existingGalleryAlbumNames from resolve_object fields.imageGallery)
- Hive root post (article, companion post, recipe walkthrough) → hive_build_post (author may be a grantor — see posting authority above) → wallet_broadcast
- Grant/revoke posting authority → hive_build_posting_authority_grant → wallet_broadcast when canSignLocally; HAS grantor session → has_broadcast with keyType active
- Avatar on existing object: ipfs_upload_image → odl_build_update_create({ updateType: "image", value: { cid } }) → wallet_broadcast
- Large body on EXISTING object (pageContent, skillContent, legalText, …): odl_build_update_create → if requiresIpfsBatch then ipfs_upload_file + odl_build_batch_import (never broadcast oversize custom_json)
- After any update_create from the tools above: do NOT add update_vote — chain-indexer auto-approves creator validity

Broadcast pitfalls:
- One object per tx; use IPFS batch when requiresIpfsBatch is true, or when odl_build_object_create returns suggestIpfsBatch / opsCount >= 4.
- wallet_broadcast accepts optional account — pass the signer explicitly when managing multiple accounts.
- Fat custom_json (near 8 KB per op) may cause timeout even when under Hive limit.

Workflow (HAS signing — optional):
1. Read MCP bearer token from ~/.odl/agent-wallet.token.
2. has_login_start → send webLink to user → poll has_login_status until active.
3. waivio_auth_start({ account }) → poll waivio_auth_status until active (uses HAS session to sign auth challenge when account is not in local registry).
4. Build ops → has_broadcast → poll has_broadcast_status immediately after phone approve (posting key auto-approve does not send a "done" UI event).
5. On has_broadcast_status expired: resolve_object first — do not resend same ops (Keychain may have already broadcast).
6. Two consecutive expired with no chain change → has_login_start (relogin); stop bulk catalog loops.

Credential separation:
- ~/.odl/agent-wallet.token — MCP bearer only
- ~/.odl/agent-wallet-session.json — HAS session only
- ~/.odl/accounts.json — local Hive WIF keys (preferred over env)
- ~/.odl/waivio-auth/<account>.json — Waivio refresh token per account (access JWT stays in memory)
- Env fallback HIVE_* keys — used only when accounts.json is missing or unreadable; never persisted

Security: binds 127.0.0.1 only; MCP requires Authorization: Bearer. Tool responses never include JWT, HAS secrets, or WIF keys.`;
