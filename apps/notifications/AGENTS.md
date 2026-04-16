# notifications — agent rules

Specialization for this app. **Shared policy** (monorepo, NestJS layering, testing, Nx) lives in the repo root [`AGENTS.md`](../../AGENTS.md).

## Role

WebSocket gateway (`@nestjs/platform-ws`, native `ws`): JWT auth on HTTP upgrade, connection registry, `subscribe` / `unsubscribe` with explicit `correlationId` acks, ping/pong keepalive. Future Redis Stream consumer will call `SubscriptionService.notifyTrxProcessed`.

## Layout

- `config/` — Zod env validation + config factory
- `domain/` — integration event types and inbound command shapes
- `ws/` — gateway, registry, subscriptions, heartbeat
- `consumers/` — `INotificationConsumer` + stub implementation

## Rules

- No Socket.IO APIs (`handshake.auth`, `client.data`). Use `IncomingMessage` + `ws` only.
- Outbound messages: `client.send(JSON.stringify({ event, data }))` via [`ws-message.ts`](src/ws/ws-message.ts).
- Controllers must not hold WS business logic beyond thin wiring; registry/subscription services own state.
