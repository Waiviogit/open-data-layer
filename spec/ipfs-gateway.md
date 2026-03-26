# IPFS Gateway

**Back:** [Spec index](README.md) · **Related:** [storage](storage.md), [overflow-strategy](overflow-strategy.md), [architecture](architecture.md)

## 1) Purpose

The **ipfs-gateway** application is a controlled HTTP layer in front of a Kubo (go-ipfs) node. It does **not** expose the full Kubo HTTP API (`/api/v0/*`) to clients.

**Normative goals:**

- Restrict the write surface to validated operations (multipart image upload, JSON upload).
- Convert uploaded images to WebP via Sharp before pinning.
- Use deterministic filenames derived from SHA-256 of content (`{sha256}.{ext}`) for deduplication-friendly naming.
- Expose read-by-CID and namespace-directory-CID discovery for integrators and replica nodes.

Future extensions (e.g. API keys) apply at this gateway layer without changing Kubo’s public exposure model.

## 2) MFS namespaces

Kubo’s **Mutable File System (MFS)** holds logical directories separate from the raw blockstore. This gateway uses two fixed roots:

| MFS path | Purpose |
|----------|---------|
| `/images` | WebP blobs after image upload |
| `/json` | JSON blobs after JSON upload |

**On startup**, `MfsInitService` ensures both directories exist (`files/mkdir` with parents).

**On each successful upload**, after `add` (which pins the blob), the gateway copies the same CID into MFS via `files/cp` (source `/ipfs/{cid}`, destination `/images/{filename}` or `/json/{filename}`). No duplicate data is stored; MFS entries reference the pinned block.

**Discovery:** `GET /ipfs-gateway/namespaces/{namespace}/cid` with `namespace` in `images` | `json` returns `{ namespace, cid }` where `cid` is the MFS directory root for that subtree (`files/stat` on `/images` or `/json`). Other nodes use this CID for bulk recursive pinning.

## 3) Peer sync (PinSyncService)

Optional **replica** behaviour. If `IPFS_PEER_URLS` is unset or empty, **no** sync runs.

When configured (comma-separated base URLs of peer gateways, e.g. `http://node-a:3001/ipfs-gateway,http://node-b:3001/ipfs-gateway`):

1. On startup and on a fixed interval (`PIN_SYNC_INTERVAL_MS`, default 300000 ms), for each namespace `images` and `json`:
2. **Fetch** remote directory CID: `GET {peer}/namespaces/{namespace}/cid` — peers are tried **in order**; first successful response wins.
3. **Compare** with local `files/stat` on `/images` or `/json`.
4. If remote CID ≠ local CID, **`pin/add` recursive** on the local Kubo for the remote directory CID so blocks are pulled into the local repo.

**Note:** Pinning updates the local blockstore and pinset. Local MFS roots may still differ from the master until MFS is updated locally; content is still retrievable by CID. Operators should treat the master as source of truth for namespace directory CIDs when coordinating replication.

## 4) Read fallback (GatewayReadService)

`GET /ipfs-gateway/files/{cid}` streams bytes for a CID.

1. **First** try local Kubo `cat` (HTTP API from the gateway process to `IPFS_API_URL`).
2. If that fails **and** `IPFS_PEER_URLS` is non-empty, try each peer in order: `GET {peer}/files/{cid}`.

No Redis or external load balancer is required for this fallback; it is sequential HTTP inside the gateway.

## 5) Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | HTTP listen port for the Nest app |
| `IPFS_API_URL` | No | `http://localhost:5001` | Kubo HTTP API base URL |
| `IPFS_GATEWAY_URL` | No | — | Public URL of an IPFS **HTTP gateway** (e.g. for `url` fields in upload responses) |
| `IPFS_PEER_URLS` | No | — | Comma-separated peer **ipfs-gateway** base URLs (include path prefix `/ipfs-gateway` if used) |
| `PIN_SYNC_INTERVAL_MS` | No | `300000` | Interval between pin-sync cycles when peers are set |

## 6) HTTP API (global prefix)

All routes are under the global prefix **`/ipfs-gateway`** (see `main.ts`).

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/upload/image` | Multipart field `file`; image converted to WebP, pinned, copied into MFS `/images/` |
| `POST` | `/upload/json` | JSON body; pinned, copied into MFS `/json/` |
| `GET` | `/files/{cid}` | Stream object by CID (local first, then peer fallback) |
| `GET` | `/namespaces/{namespace}/cid` | `namespace` ∈ `images` \| `json`; returns directory CID for bulk pin |

OpenAPI/Swagger is served at `/ipfs-gateway/docs` when the app is running.

## 7) Architecture diagram

```mermaid
flowchart TD
  subgraph upload [Upload path]
    UC["UploadController"]
    UC -->|"add + pin"| Kubo["Kubo API"]
    UC -->|"files/cp"| MFS["MFS /images / /json"]
  end

  subgraph ns [Namespace CID]
    NC["NamespacesController"]
    NC -->|"files/stat"| MFS
  end

  subgraph sync [Pin sync replica]
    PS["PinSyncService"]
    PS -->|"GET namespaces/.../cid"| Peer["Peer gateways"]
    PS -->|"files/stat vs remote"| Kubo
    PS -->|"pin/add recursive"| Kubo
  end

  subgraph read [Read path]
    GR["GatewayReadService"]
    GR -->|"cat"| Kubo
    GR -->|"GET /files/cid"| Peer
  end
```

## 8) Caching guidance

CID-addressed content is **immutable** by definition (the same CID always resolves to the same bytes). The `GET /files/{cid}` endpoint should return aggressive cache headers:

```
Cache-Control: public, max-age=31536000, immutable
```

This applies **only** to `GET /files/{cid}`. Other endpoints must not be cached long-term:

| Endpoint | Caching | Reason |
|----------|---------|--------|
| `GET /files/{cid}` | `public, max-age=31536000, immutable` | CID = content hash; content never changes |
| `GET /namespaces/{ns}/cid` | `no-cache` or short `max-age` | Directory CID changes on every new upload |
| `POST /upload/*` | Not cacheable | Mutating requests |

When deploying behind a CDN (Cloudflare, Nginx, etc.), point `IPFS_GATEWAY_URL` at the CDN domain so upload responses return CDN-accelerated URLs directly (e.g. `https://cdn.example.com/ipfs/{cid}`).

## 9) Informative: relation to overflow storage

The indexer and overflow pipeline may reference IPFS CIDs for large payloads. This gateway is the **operational** ingress and coordination layer for **images and JSON** namespaces used by the platform; the exact linkage to Hive/overflow events is defined in [storage](storage.md) and [overflow-strategy](overflow-strategy.md).
