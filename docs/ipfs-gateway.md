# IPFS Gateway — Developer Guide

How to run **ipfs-gateway** locally with Kubo, configure peers for replication, and verify behaviour.

## Prerequisites

- Node.js ≥ 20, pnpm (see [dev-environment.md](dev-environment.md))
- A **Kubo** node with HTTP API enabled (default `http://localhost:5001`)

## Running Kubo

Use an official Kubo release or Docker image. The gateway expects the **HTTP API** at `IPFS_API_URL` (default `http://localhost:5001`).

Example (Docker, illustrative — adjust ports/volumes for your setup):

```bash
docker run -d --name kubo -p 4001:4001 -p 5001:5001 -p 8080:8080 ipfs/kubo:latest
```

Verify the API responds:

```bash
curl -X POST "http://localhost:5001/api/v0/version"
```

## Environment variables

| Variable | Default | Notes |
|----------|---------|--------|
| `PORT` | `3001` | `ipfs-gateway` HTTP port |
| `IPFS_API_URL` | `http://localhost:5001` | Kubo HTTP API base URL |
| `IPFS_GATEWAY_URL` | — | Optional public gateway URL for `url` in upload responses |
| `IPFS_PEER_URLS` | — | Comma-separated peer gateway base URLs (e.g. `http://node:3001/ipfs-gateway`) |
| `PIN_SYNC_INTERVAL_MS` | `300000` | Pin-sync interval when peers are configured |

Peer URLs must include the **global path prefix** if your deployment uses it (e.g. `/ipfs-gateway`).

## Start the app

From the workspace root:

```bash
pnpm nx serve ipfs-gateway
```

Production build:

```bash
pnpm nx build ipfs-gateway
```

OpenAPI: `http://localhost:3001/ipfs-gateway/docs` (with default `PORT`).

## Configure peer sync (replica)

Set `IPFS_PEER_URLS` to one or more **master** gateway base URLs. On startup and on each interval, the gateway will:

1. Fetch `GET {peer}/namespaces/images/cid` and `.../json/cid` (first peer that responds wins per namespace).
2. Compare with local MFS directory CID.
3. Run recursive `pin/add` on the local Kubo for the remote directory CID when they differ.

If `IPFS_PEER_URLS` is empty, pin sync and read fallback to peers are **disabled**.

## Verify behaviour

- **Logs:** On startup with peers, look for `Pin sync enabled`. When peers are empty: `Pin sync disabled`.
- **Namespace CIDs:** `curl http://localhost:3001/ipfs-gateway/namespaces/images/cid`
- **Lint/build:** `pnpm nx lint ipfs-gateway` and `pnpm nx build ipfs-gateway`

## Useful commands

| Command | Description |
|---------|-------------|
| `pnpm nx serve ipfs-gateway` | Dev server with watch |
| `pnpm nx build ipfs-gateway` | Production webpack build |
| `pnpm nx lint ipfs-gateway` | ESLint |

## CDN / caching

CID-addressed content is immutable -- the same CID always returns the same bytes. When deploying behind a CDN or reverse proxy:

- Set `Cache-Control: public, max-age=31536000, immutable` on `GET /files/{cid}` responses.
- Do **not** cache `GET /namespaces/{ns}/cid` (directory CID changes on each upload).
- Point `IPFS_GATEWAY_URL` at the CDN domain so upload responses return CDN URLs directly.

## Normative specification

See [spec/ipfs-gateway.md](../spec/ipfs-gateway.md) for MFS namespaces, peer sync, read fallback, and API summary.
