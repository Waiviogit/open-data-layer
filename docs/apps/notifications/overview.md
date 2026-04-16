# notifications

## Purpose

NestJS service exposing a **native WebSocket** endpoint (`@nestjs/platform-ws`) for authenticated clients. Delivers real-time messages (e.g. transaction processed) and supports subscribe/unsubscribe by `trx_id` with explicit correlation IDs.

## Stack

- NestJS 11, JWT (`JWT_SECRET`, shared with auth tokens)
- Native `ws` ping/pong heartbeat
- Stub `INotificationConsumer` until Redis Streams is wired

## Verification

```bash
pnpm nx build notifications
pnpm nx lint notifications
pnpm nx serve notifications
```

WebSocket URL: `ws://<host>:<PORT>/notifications` (default port `7200`).

## Feature specs

| Topic | Doc |
|-------|-----|
| (none yet) | — |

Add feature specs under `docs/apps/notifications/spec/` when behavior expands beyond this overview.
