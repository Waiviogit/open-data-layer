# notifications — agent rules

Specialization for this app. **Shared policy** (monorepo, NestJS layering, testing, Nx) lives in the repo root [`AGENTS.md`](../../AGENTS.md).

## Role

WebSocket gateway (`@nestjs/platform-ws`, native `ws`): JWT auth on HTTP upgrade, connection registry, `subscribe` / `unsubscribe` / `get_notifications` with explicit `correlationId` acks, ping/pong keepalive. Redis Stream consumer routes events via `NotificationRouterService` and writes per-user feeds in Redis.

## Layout

- `config/` — Zod env validation + config factory (`WS_MAX_CONNECTIONS_PER_USER`, default 5)
- `constants/` — Redis stream + feed key helpers and TTL limits
- `database/` — Kysely `DatabaseModule`
- `repositories/` — recipient resolution queries
- `domain/` — router, feed service, user notification item shape
- `ws/` — gateway, registry, subscriptions, heartbeat
- `consumers/` — `INotificationConsumer` + Redis Stream implementation

## Rules

- No Socket.IO APIs (`handshake.auth`, `client.data`). Use `IncomingMessage` + `ws` only.
- Outbound messages: `client.send(JSON.stringify({ event, data }))` via [`ws-message.ts`](src/ws/ws-message.ts).
- Controllers must not hold WS business logic beyond thin wiring; registry/subscription services own state.
