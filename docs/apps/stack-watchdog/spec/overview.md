# stack-watchdog

NestJS sidecar for the VPS **`apps`** Compose stack. Every **5 minutes** it runs **`docker compose pull`** on configured services (long-running app containers plus **`migrator`** and **`stack-watchdog`** itself), then **`docker compose up -d --remove-orphans`** on **long-running services only** — so new GHCR digests roll out without pulling Komodo/Portainer automation.

Once per day (cron **`0 3 * * *`**, 03:00 in the container’s local time — usually UTC) it runs **`docker image prune -a -f`** to drop **unused** images (not referenced by any container), reclaims disk from old image layers after pulls.

## Scope

- **One host = one `DEPLOY_ENV`**: `staging` or `production`, matching `docker-compose.${DEPLOY_ENV}.apps.yml` on disk (`INSTALL_DIR`).
- **Does not** run `migrator` automatically; it only **pulls** the migrator image so `docker compose … run --rm migrator` uses a fresh image after sync.
- **Does not** recreate itself via `up -d` (not in the “up” list), avoiding self-interrupt during updates; pull still refreshes its image on disk.

## Security

The container mounts **`/var/run/docker.sock`** and bind-mounts the repo at **`INSTALL_DIR` (read-only)** for compose files and `.env`. Socket access is equivalent to **root on the host** — restrict host access accordingly.

## Configuration

| Variable | Purpose |
|----------|---------|
| `DEPLOY_ENV` | `staging` \| `production` — compose filename selector |
| `INSTALL_DIR` | Repo root on the host (POSIX path, e.g. `/opt/open-data-layer`) |
| `STACK_WATCHDOG_ENABLED` | Compose sets `'true'` on the watchdog service; omit/false locally for `nx serve` |
| `STACK_WATCH_RUNTIME_SERVICES` | Optional CSV override for pull+up service names |
| `STACK_WATCH_EXTRA_PULL_SERVICES` | Optional CSV extra names for **pull** only |

`scripts/setup-vps.sh` appends **`DEPLOY_ENV`** to `.env` when missing so it stays aligned with the bootstrap target.

## Operator notes

- Order after releases: wait for sync (or run compose manually) → run **`migrator`** if schema changed → apps restart via watchdog’s `up`.
- Updating **only** the watchdog container: after a new image is on the host, run  
  `docker compose -p apps … up -d stack-watchdog` once.

Implementation entrypoints: [`apps/stack-watchdog`](../../../../apps/stack-watchdog).
