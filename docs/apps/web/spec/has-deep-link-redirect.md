---
id: docs-apps-web-spec-has-deep-link-redirect
title: HAS deep-link redirect page
description: Public /has route opens Hive Keychain Mobile from https links in chat messengers via has://auth_req fragment payload.
type: spec
status: active
scope: web
tags: [web, has, hiveauth, keychain, redirect]
updated_at: 2026-08-12
related:
  - docs/apps/web/spec/routing-proxy.md
  - docs/apps/web/spec/overview.md
---

# HAS deep-link redirect page

Public route **`/has`** converts a click on an `https://` link (e.g. in Telegram) into `has://auth_req/{base64}` so Hive Keychain Mobile can open.

## URL shape

```
https://<origin>/has#<fragment>
```

- **Fragment only** — everything after `#` stays in the browser; nginx/Next never log `auth_key`.
- Payload always resolves to `account`, `uuid`, `key`, `host` (`wss://…` HAS server).
- Built by `agent-wallet` `has_login_start` as `webLink` (default origin `https://waiviodev.com`).

### Fragment formats

Two formats are accepted. Both decode to the same payload and the same `has://auth_req/{base64-json}` deep link.

| Format | Shape | Emitted by |
|--------|-------|------------|
| **compact v1** | `1` + base64url of a binary record, ~59 chars | current agent-wallet |
| **legacy** | base64 of the payload JSON, ~204 chars | already released agent-wallet binaries |

Compact v1 layout:

```
byte 0        host index (0 = wss://hive-auth.arcange.eu, 255 = inline)
[if 255]      1 byte host length + host ascii
next 16 bytes uuid
next 16 bytes auth key
remaining     account name, ascii
```

The compact format exists because base64 of JSON always begins with `eyJ` — the shape of a JWT. Chat clients run secret redactors that cut such strings in half, which silently breaks any login link delivered over a messenger. Compact fragments never contain `eyJ`. See skill `has-login-from-chat`.

Legacy support stays for binaries already in the wild; it works in a browser, but such links cannot be delivered through chat.

## Page behavior

Route: `apps/web/src/app/(public)/has/page.tsx` → client `HasRedirectPanel`.

1. Parse and validate fragment (`parseHasAuthFragmentPayload`, compact first then legacy).
2. Show **Open Keychain** button → `window.location.href = has://auth_req/...` (primary path — required for Telegram in-app browser).
3. Show copyable `has://` string + hint to open in Safari/Chrome if needed.
4. No server API calls; no auth cookies required.

## Proxy / REQUIRE_AUTH

`REQUIRE_AUTH=true` (waiviodev) redirects anonymous users to `/sign-in` except excluded prefixes. **`/has` is excluded** in `apps/web/src/proxy.ts` so HAS login links work without a Waivio session.

## Verification

```bash
pnpm nx test web --testPathPatterns="has-|proxy"
pnpm check:web-i18n-utf8
```

Manual: open `https://<origin>/has#<valid-fragment>` on phone → tap Open Keychain → Keychain Mobile auth prompt.

## Related code

| Path | Role |
|------|------|
| `apps/web/src/modules/auth/infrastructure/providers/has/has-fragment-payload.ts` | Parse/validate fragment, both formats |
| `apps/web/src/modules/auth/infrastructure/providers/has/has-compact-link.ts` | Compact v1 decoder (mirrors `libs/hive-auth/src/has-compact-link.ts`) |
| `apps/web/src/modules/auth/presentation/components/has-redirect-panel.tsx` | UI |
| `apps/web/src/proxy.ts` | `/has` auth exclusion |
