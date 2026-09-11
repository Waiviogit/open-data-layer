---
id: web-pages-notifications-settings
title: Notification settings page
description: "/notifications/settings — read via query-api, save via Hive OSL broadcast."
type: spec
status: active
scope: web
tags: [web, page, notifications]
related:
  - docs/apps/web/spec/pages/notifications/page.md
  - docs/apps/query-api/spec/user-notification-settings.md
updated_at: 2026-07-30
---

# Notification settings page

**Route:** `/notifications/settings` (auth required)

## Layout

[`NotificationSettingsPageClient`](../../../../apps/web/src/modules/notifications/presentation/components/notification-settings-page-client.tsx):

1. Title + back link to `/notifications` (`OptimisticNavLink`)
2. Telegram intro (same env props as feed page)
3. Form sections: Community actions (includes **Direct and group messages** / `messages` and **Business** / `obl` toggles), Wallet transactions, My actions, Security alerts (display-only, always on)

## Read path

- Browser: `GET /api/users/:name/notification-settings` (session must match `:name`)
- BFF proxies to query-api with `X-Viewer`
- Hook: `useNotificationSettings`

## Save path

1. `buildOslUpdateUserNotificationSettingsOp` (`@opden-data-layer/hive-broadcast`) with `useOslCustomJsonId()` → `osl-mainnet` / `osl-testnet`
2. `getWalletFacade().broadcast`
3. `awaitTrxConfirmation`
4. `refreshAfterBroadcast` + `revalidateNotificationSettingsAfterBroadcast` + client `reload()`

## Navigation + loading

- Feed intro settings link uses **`OptimisticNavLink`** for instant URL change
- [`loading.tsx`](../../../../apps/web/src/app/(app)/notifications/settings/loading.tsx) renders `NotificationSettingsSkeleton`
- Client shows skeleton while `useNotificationSettings` is loading (double guard)

## Env

- `NOTIFICATIONS_TELEGRAM_BOT_USERNAME` — Telegram bot link in intro (server getters, passed as props)

## Verification

| Command | Purpose |
|---------|---------|
| `pnpm nx test web --testPathPatterns=notification-settings` | Settings UI unit coverage |
| Manual | Toggle → Save → trx confirms → refetch shows new values |
