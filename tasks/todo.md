# GeoIP volume + GeoipReaderService

## Implementation

- [x] Compose: geoipupdate profile + named volume (prod/staging/manual); infra bind-mount `./data/geoip`
- [x] Env: MAXMIND_*, COMPOSE_PROFILES, GEOIP_DB_PATH, TRUST_PROXY, Zod, gitignore
- [x] `pnpm add maxmind`
- [x] query-api `domain/geoip` + MainModule
- [x] Client IP: trust proxy, resolveClientIp, ReqClientIp, MCP context, web XFF forward
- [x] Tests from plan catalog
- [x] Docs + review

## Verification

- [x] `pnpm nx test query-api` — 830 passed
- [x] `pnpm nx test web -- --testPathPatterns=client-ip-forward-headers` — 4 passed
- [x] `pnpm nx run query-api:typecheck`
- [x] `pnpm nx run web:typecheck`
- [x] `pnpm nx lint query-api` — 0 errors (pre-existing warnings elsewhere)
- [x] `pnpm nx build query-api`
- [x] `pnpm check:bundle-deps` — maxmind bundled, not an external require
- [x] `docker compose … config` — production/staging/manual/infra; `-p apps` still uses `name: geoip_data`

Local MMDB smoke (download + file replace) not run here: no MaxMind key in this session. Covered by reader retry/disabled unit tests.

## Review

- `geoipupdate` image pinned to `ghcr.io/maxmind/geoipupdate:v8.0.0`, profile `geoip`.
- query-api mounts the volume read-only; only that app loads the MMDB.
- Infra uses `./data/geoip` so `pnpm nx serve query-api` can read `GEOIP_DB_PATH=data/geoip/GeoLite2-City.mmdb`.
- Client IP: one `resolveClientIp` for REST (`ReqClientIp`) and MCP (`McpRequestContext.clientIp` from the HTTP request, not tool args).
- Web copies `X-Forwarded-For` verbatim when `forwardClientIp: true`; default off so RSC stays cacheable.
- Object-page resolve now passes `forwardClientIp: true` so the GeoIP probe sees the browser IP behind nginx.
- stack-watchdog pull/up appends `geoipupdate` only when `COMPOSE_PROFILES` includes `geoip`.

## Follow-ups

- Affiliate: persist `country_code` at click time, not the IP.
- auth-api logs `req.ip` without `trust proxy` (nginx container IP today).
- Round coordinates in API responses for maps.
- Optional DB-IP Lite as a keyless MMDB provider.
- HTTP geo endpoint / MCP geo tool when a consumer exists.
