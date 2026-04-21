# auth-api

**Back:** [docs README](../../README.md)

## Purpose

NestJS service for Hive-based login (Keychain challenge-response, HiveAuth payload verification, HiveSigner OAuth callback) and issuance of **first-party** JWT access + refresh tokens. Protected APIs should accept only `Authorization: Bearer <access_token>` issued here.

## Stack

- NestJS, Kysely + PostgreSQL (tables `auth_challenges`, `auth_identities`, `refresh_sessions`)
- `@nestjs/jwt`, `@hiveio/dhive` (signature verification), `hivesigner` (authorize URL builder)
- Migrations: `libs/migrations/src/postgres/odl/00001_odl_schema.ts` (includes auth tables)

## HTTP surface

Base URL shape: `http://<host>:<port>/auth/v1/...` (global prefix `auth`, URI versioning `v1`). See [challenge-flow.md](spec/challenge-flow.md).

## Verification

```bash
pnpm nx build auth-api
pnpm nx serve auth-api
```

Requires `JWT_SECRET` and Postgres with auth tables migrated (`pnpm migrate:latest` from repo root).

## Feature specs

| Spec | Description |
|------|-------------|
| [challenge-flow.md](spec/challenge-flow.md) | Provider flows and endpoints |
