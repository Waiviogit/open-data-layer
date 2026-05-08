# Portainer CE on the VPS

Portainer provides a Docker UI for operators. GHCR image updates for the **`apps`** stack can be handled automatically by the **`stack-watchdog`** sidecar (see [stack-watchdog spec](../apps/stack-watchdog/spec/overview.md)), or manually (`docker compose pull && docker compose up`) or via Portainer when you choose to update images.

## Access (localhost only)

The infra Compose file publishes Portainer as **`127.0.0.1:9443 → 9443`** (HTTPS inside the container). **nginx does not proxy Portainer**; there is no public route.

- On the VPS: open **`https://127.0.0.1:9443`** in a browser.
- From your machine: **`ssh -L 9443:127.0.0.1:9443 user@your-host`** then browse **`https://127.0.0.1:9443`** locally.

Accept browser warnings if Portainer still presents its default certificate.

## First setup

After bootstrap (`scripts/setup-vps.sh`), complete Portainer’s **initial admin** wizard. **Do not store admin passwords in git.**

## Data

Configuration and metadata live in the **`portainer_data`** Docker volume (`/data` in the container). Back up that volume if you rely on Portainer-defined stacks.

## Updating Portainer

Edit the pinned image tag in `docker-compose.<env>.infra.yml`, then:

```bash
cd /opt/open-data-layer   # or your INSTALL_DIR
docker compose -p infra --env-file .env -f docker-compose.staging.infra.yml pull portainer
docker compose -p infra --env-file .env -f docker-compose.staging.infra.yml up -d portainer
```

Use `docker-compose.production.infra.yml` for production.

## Managing the `apps` stack

Application containers are defined in **`docker-compose.<env>.apps.yml`** with Compose **project name `apps`** (see `scripts/setup-vps.sh`).

Typical CLI workflow (when not relying on **stack-watchdog**):

```bash
docker compose -p apps --env-file .env -f docker-compose.staging.apps.yml pull
docker compose -p apps --env-file .env -f docker-compose.staging.apps.yml up -d
```

You can also add a Stack in Portainer pointing at the same compose file on disk. With **stack-watchdog** enabled in compose, periodic pull/up covers digest updates; Portainer remains useful for inspection and manual overrides.

## Migrating from Komodo

After `git pull` and bringing infra up, old **`komodo-*`** volumes may remain until you **`docker volume rm`** them (or prune). A legacy **`compose.env`** file is unused and safe to delete.
