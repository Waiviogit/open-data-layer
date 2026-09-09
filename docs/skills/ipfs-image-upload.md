# IPFS image upload for ODL agents

Use this skill when an agent must attach images to ODL object updates via `agent-wallet`.

## Prerequisites

1. Active Waivio JWT session (`waivio_auth_start` → `waivio_auth_status`).
2. `agent-wallet` MCP bearer token.
3. Default API origin: `https://waiviodev.com` (`WAIVIO_API_ORIGIN` override for other stacks).

## Upload tool

```
ipfs_upload_image({ filePath: "/absolute/or/relative/path/to/image.png" })
```

Returns `{ cid, contentUrl, url? }`. **Never** write `url` or `contentUrl` into ODL updates when `cid` is present — on-chain value is `{ "cid": "<returned-cid>" }` only.

**Do not** bypass `ipfs_upload_image` with manual `curl` to the gateway. The tool sets the correct image MIME on multipart upload; raw `curl` without `Content-Type` yields `application/octet-stream` and gateway 400.

## Avatar preparation

Mirror the web image editor ([`image-editor-config.ts`](../../apps/web/src/modules/object-updates/application/image-editor-config.ts)):

| updateType | Aspect | Max size | Agent action |
|------------|--------|----------|--------------|
| `image` (avatar) | **1:1** | **1024px** | Center-crop the subject; do not upload landscape/portrait as-is |
| `imageBackground` | natural | 1920px | No forced square |
| `imageGalleryItem` | natural | 1920px | No forced square |

Rules:

- The web UI renders avatars in a square frame with `object-cover` — a non-square upload is center-cropped without your control over framing.
- When generating images (Grok, DALL·E, etc.), request **1024×1024** (1:1) from the start when possible.
- For `image`, always use **IPFS** (`ipfs_upload_image` → `{ cid }`). Do not store generated or session CDN URLs on chain.
- If the image comes from Grok/xAI (`files-cdn.x.ai`, etc.), download it locally, prepare 1:1, then upload via `ipfs_upload_image`. Temporary CDN URLs are not durable storage.
- For gallery external URLs (`{ album, url }`), use only stable origins and verify the URL loads directly before broadcast. For generated or temporary CDN assets, prefer IPFS upload instead.

## Verification before broadcast

1. Confirm `contentUrl` from the tool response opens in a browser or returns `200` with an image content-type (`HEAD` or `GET`).
2. After `wallet_broadcast` / `has_broadcast`, resolve the object via query-api (`resolve_object` on `POST /query/mcp` or equivalent) and check `fields.image` is the same content URL pattern: `{origin}/ipfs-gateway/content/image/{cid}`.

If `fields.image` is set and the content URL loads, web avatars appear after deploy — no re-broadcast needed.

## Broadcast to existing object

**Do not** use `odl_build_object_create` when the object already exists — it always emits `object_create` and will fail.

### Avatar (`updateType: "image"`)

After `ipfs_upload_image`:

```
odl_build_update_create({
  objectId: "recipe-butter-garlic-naan-tawa",
  creator: "alice",
  updateType: "image",
  value: { cid: "Qm..." }
})
→ wallet_broadcast({ ops })
```

Single `update_create` only — **do not** broadcast `update_vote` afterward. Chain-indexer auto-approves the creator's update.

### Gallery photo (`updateType: "imageGalleryItem"`)

1. `resolve_object` → read `fields.imageGallery` album names.
2. Upload via IPFS or use a stable external URL.
3. `odl_build_gallery_item({ objectId, creator, itemValue: { album, cid }, existingGalleryAlbumNames })`
4. `wallet_broadcast({ ops })` — no follow-up `update_vote`

## Update policy

### Object avatar (`updateType: "image"`)

**Mandatory IPFS path:**

1. Prepare a **1:1** image (512–1024px, subject centered).
2. `ipfs_upload_image` the local file.
3. Verify `contentUrl` loads.
4. Write update value as `{ "cid": "<returned-cid>" }` only via `odl_build_update_create` (existing object) or `odl_build_object_create` fields (new object only).
5. Use `contentUrl` for preview in chat if needed — not in the blockchain update.

### Gallery item (`updateType: "imageGalleryItem"`)

Either:

- `{ "album": "<albumId>", "cid": "<cid>" }` after IPFS upload, or
- `{ "album": "<albumId>", "url": "https://..." }` for stable external HTTPS images.

Do not send both `cid` and `url` in the same gallery item.

### Gallery album (`updateType: "imageGallery"`)

Album metadata / reference only — not the image bytes. See object-create specs.

## Local signing alternative (no HAS)

Preferred: `~/.odl/accounts.json` with posting (and optional active) keys. Env fallback:

```powershell
$env:AGENT_WALLET_SIGNING_MODE = "local"
$env:HIVE_ACCOUNT = "alice"
$env:HIVE_POSTING_KEY = "5K..."
# optional — active ops only:
$env:HIVE_ACTIVE_KEY = "5K..."
```

Or use a gitignored `.env` loaded by your launcher.

`HIVE_ACTIVE_KEY` is **not** required for Waivio JWT auth or typical ODL `custom_json` posting ops.

## Large ODL bodies (not images)

Oversize `update_create` / object-create envelopes use **`ipfs_upload_file`** and **`batch_import`**, not `ipfs_upload_image`. See [ipfs-file-upload.md](ipfs-file-upload.md).

## Related skills

- [ipfs-file-upload.md](ipfs-file-upload.md) — ODL JSON upload for `batch_import`
- [hive-has-agent-wallet.md](./hive-has-agent-wallet.md) — HAS login and broadcast
- [hive-blockchain-broadcast.md](./hive-blockchain-broadcast.md) — ODL op construction
