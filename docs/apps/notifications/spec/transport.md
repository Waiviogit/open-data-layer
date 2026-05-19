# Notifications transport

Cross-service events flow from **chain-indexer** to **notifications** via a Redis Stream. The JSON contract is defined in `@opden-data-layer/notifications-contract`.

## Redis keys

| Key | Type | Producer | Consumer |
|-----|------|----------|----------|
| `chain-indexer:notifications:stream` | Stream | chain-indexer (`XADD`) | notifications (`XREADGROUP` / `XACK`) |
| `notifications:list:{username}` | List | notifications (`LPUSH` + `LTRIM` + `EXPIRE`) | notifications (`LRANGE`) + WS live push |

Consumer group: `notifications-consumers`.

## WebSocket connection limits

- `WS_MAX_CONNECTIONS_PER_USER` (default **5**): when a user opens a 6th connection, the oldest socket is closed with code `1008` / `connection_limit_exceeded`.

## Feed rules

- Max **25** items per user (`LTRIM 0 24` after `LPUSH`).
- TTL **14 days** (`EXPIRE`), refreshed on each write.

## Routing (notifications service)

| Event | Recipients |
|-------|------------|
| `update_vote_cast` | Object creator + `object_authority` (administrative) + `user_object_follows` where `bell = true`; exclude `actor` |
| `follow` | `payload.following` |
| `object_created` | None (reserved) |
| `trx_processed` | WebSocket subscribers for `trxId` |

## Swapping transport

Replace `NOTIFICATION_PUBLISHER` / `NOTIFICATION_CONSUMER` implementation bindings only; keep `NotificationEvent` JSON stable.
