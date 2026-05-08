# Komodo on VPS (replaces Portainer)

Komodo [v2+](https://komo.do/) manages the **application** Compose stack on each VPS: it polls registries for new digests on rolling tags (`:staging`, `:production`) and can redeploy automatically. **No inbound webhooks** are required—GitHub Actions only builds and pushes images.

Infrastructure (Postgres, Redis, IPFS, Komodo itself, nginx) lives in a **separate** Compose project so Komodo never tries to redeploy the stack it runs inside.

## Layout

| Compose project `-p` | File(s) | Purpose |
|----------------------|---------|---------|
| `infra` | `docker-compose.<env>.infra.yml` | Postgres, Redis, IPFS, `komodo-mongo`, `komodo-core`, `komodo-periphery`, nginx |
| `apps` | `docker-compose.<env>.apps.yml` | GHCR images: indexer, APIs, web, scheduler, migrator (profile `tools`), … |

Shared Docker network: `opden-data-layer-net` (created by [`scripts/setup-vps.sh`](../../scripts/setup-vps.sh)).

Bootstrap secrets for Komodo: **`compose.env`** (generated from [`compose.env.example`](../../compose.env.example), gitignored on the server).

## First boot

1. Run [`scripts/setup-vps.sh`](../../scripts/setup-vps.sh) with `DEPLOY_ENV=staging` or `production`.
2. Open **`https://<DOMAIN>/komodo/`** — nginx Basic Auth (see `nginx/.htpasswd`), then **Komodo** login. Initial admin credentials are set in `compose.env` as `KOMODO_INIT_ADMIN_USERNAME` / `KOMODO_INIT_ADMIN_PASSWORD` (randomized on first `compose.env` creation).
3. **Import the apps stack** as a `Stack` resource:
   - **Server:** the default “Local” server (Periphery on the same host).
   - **`run_directory`:** your clone path (default `/opt/open-data-layer`).
   - **`file_paths`:** e.g. `docker-compose.staging.apps.yml` or `docker-compose.production.apps.yml` (match `DEPLOY_ENV`).
   - **`project_name`:** `apps` — must match `docker compose -p apps` from the bootstrap script so Komodo adopts the running project.
   - Enable **`poll_for_updates = true`** and **`auto_update = true`** on the stack ([Compose stack options](https://komo.do/docs/deploy/compose)).
4. **Global Auto Update procedure:** new installs include a daily job. Change the schedule (e.g. **`*/15 * * * *`**) so digest checks run every 15 minutes ([Automatic updates](https://komo.do/docs/deploy/auto-update)).

`migrator` is **not** auto-deployed: it uses Compose profile `tools` and `restart: "no"`. Run migrations manually when needed (see [Migrations](../operations/migrations.md#running-migrations-on-vps--docker)).

## Updating Komodo images

Pinned tag family `:2` for Core and Periphery (`COMPOSE_KOMODO_IMAGE_TAG` in `compose.env`).

```bash
cd /opt/open-data-layer   # or your INSTALL_DIR
docker compose -p infra --env-file .env --env-file compose.env \
  -f docker-compose.staging.infra.yml pull komodo-core komodo-periphery komodo-mongo
docker compose -p infra --env-file .env --env-file compose.env \
  -f docker-compose.staging.infra.yml up -d
```

Use `docker-compose.production.infra.yml` on production.

## Reverse proxy note

`KOMODO_HOST` in `compose.env` must be the public URL (e.g. `https://example.com/komodo`). If the UI misbehaves behind `/komodo/`, consider a dedicated subdomain and update nginx accordingly.

## Troubleshooting

- **HTTPS / `live//` in nginx logs / only `default.conf.nokey`:** set `DOMAIN` and `CERTBOT_EMAIL` in `.env`, then **re-run** `sudo bash scripts/setup-vps.sh` from `/opt/open-data-layer` (same `DEPLOY_ENV`). The script always rebuilds `default.conf` from `default.conf.template`, deletes stale `.nokey`, and recreates the nginx container.

- **Stacks not updating:** confirm **Global Auto Update** procedure is enabled and scheduled; confirm stack has `auto_update` / `poll_for_updates` and uses rolling tags.
- **Periphery cannot see compose files:** `PERIPHERY_ROOT_DIRECTORY` in `compose.env` must equal the host install path, and the same path must be bind-mounted into `komodo-periphery` (see infra compose).
- **`compose.env` / Mongo password changed after first boot:** Mongo init only runs on an empty volume; rotate credentials via Komodo/Mongo docs if needed.

## Verification checklist

1. **Compose syntax (local):** `cp compose.env.example compose.env`, adjust dummy values if needed, then:
   - `docker compose -p infra --env-file .env --env-file compose.env -f docker-compose.staging.infra.yml config`
   - `docker compose -p apps --env-file .env -f docker-compose.staging.apps.yml config`
   Do not commit `compose.env` (gitignored).
2. **VPS:** Run `scripts/setup-vps.sh`, open `https://<DOMAIN>/komodo/`, import the `apps` stack with `project_name=apps`, enable `auto_update` and `poll_for_updates`, set **Global Auto Update** schedule (e.g. every 15 minutes), push a trivial image rebuild, confirm the affected service redeploys.

## References

- Komodo setup (Mongo): [komo.do/docs/setup/mongo](https://komo.do/docs/setup/mongo)
- Docker Compose stack resource: [komo.do/docs/deploy/compose](https://komo.do/docs/deploy/compose)
