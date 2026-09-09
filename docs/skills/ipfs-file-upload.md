# IPFS file upload for ODL batch import

Use when an ODL envelope (create or update) exceeds Hive `custom_json` limits and must be published via **`batch_import`**.

## Endpoints

| Route | Content | Processing | Max size |
|-------|---------|------------|----------|
| `POST /ipfs-gateway/upload/image` | Multipart image | WebP via Sharp | **50 MiB** (gateway) |
| `POST /ipfs-gateway/upload/file` | Raw `application/octet-stream` | Streamed as-is | **16 MiB** (gateway) |

Agent-wallet **`ipfs_upload_image`** → `/upload/image`. **`ipfs_upload_file`** → `/upload/file` (ODL JSON envelopes).

## Agent-wallet limits

| Tool | Max bytes | Typical payload |
|------|-----------|-----------------|
| `ipfs_upload_image` | 50 MiB | Avatars, gallery photos |
| `ipfs_upload_file` | **10 MiB** | ODL `{ "events": [...] }` JSON for `batch_import` |

Gateway accepts up to 16 MiB on `/upload/file`; agent-wallet enforces 10 MiB client-side. Indexer `batch_import` cap is also 16 MiB.

## Shared Kubo node (ops)

**`ipfs-gateway` and `chain-indexer` must use the same Kubo HTTP API** (`IPFS_API_URL`). The gateway pins uploaded envelopes to its connected node; the indexer replays `batch_import` via `IpfsClient.cat(ref)` on **its** node. If those URLs point at different Kubos, a fresh CID may not resolve within the indexer retry window (~7s default) and the batch is dropped silently.

Docker Compose defaults both services to `http://ipfs:5001`. Split stacks or misconfigured env vars are a common production failure mode — verify before enabling IPFS overflow in production.

## Workflow (`requiresIpfsBatch`)

1. `odl_build_object_create` or `odl_build_update_create` → `requiresIpfsBatch: true`, `envelopeJson`
2. `ipfs_upload_file({ content: envelopeJson, account })` → `{ cid }`
3. `odl_build_batch_import({ account, cid })` → `{ ops }`
4. `wallet_broadcast` / `has_broadcast`

Web uses the same pattern via `uploadOdlToIpfs` + `buildOdlBatchImportOp` — see [object-create-broadcast](../apps/web/spec/object-create-broadcast.md).

## Prerequisites

Same as [ipfs-image-upload.md](ipfs-image-upload.md): active Waivio JWT (`waivio_auth_*`), agent-wallet bearer token, `WAIVIO_API_ORIGIN` pointing at the stack with ipfs-gateway.

## Related

- [hive-has-agent-wallet.md](hive-has-agent-wallet.md) — MCP tools and overflow recipe
- [hive-blockchain-broadcast.md](hive-blockchain-broadcast.md) — `buildOdlBatchImportOp`
- [ipfs-image-upload.md](ipfs-image-upload.md) — image uploads and avatar policy
- [ipfs-gateway overview](../apps/ipfs-gateway/spec/overview.md) — gateway HTTP API
