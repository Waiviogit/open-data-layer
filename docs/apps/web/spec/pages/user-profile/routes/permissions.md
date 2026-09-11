---
id: docs-apps-web-spec-pages-user-profile-routes-permissions
title: User profile permissions page
description: Public profile page listing Hive account authority grants with grant/revoke for the owner.
type: spec
status: active
scope: web
tags: [web, user-profile, hive, authority]
updated_at: 2026-09-11
related:
  - docs/apps/web/spec/pages/user-profile/overview.md
  - docs/apps/query-api/spec/user-account-auths-endpoint.md
  - docs/spec/hive-account-authority.md
---

# User profile permissions page

Route: `/@{username}/permissions` (internal: `/user-profile/{name}/permissions`).

Full-width layout under the profile hero (same shell family as map — no left/right rails).

## Tabs

| Tab | API | Actions |
| --- | --- | --- |
| **Granted Authorities** | `GET .../authority-grantees` | Add/remove posting & active when viewer owns profile; owner rows view-only |
| **Received Authorities** | `GET .../authority-grantors` | View only |

Query params: `tab=granted|received` (default granted), `type=posting|active|owner` (omit = all), `sort=rank|followers|a-z|recency` (default `a-z`).

## Hive semantics

Lists show **direct** `account_auths` edges only (one hop). Hive consensus may allow nested signing up to depth 2 — e.g. if you grant posting to B and B grants posting to C, C can post as you on chain even though this page lists only B.

Granting authority means trusting the recipient **and** their own delegation tree (same authority type, depth 2). Active grants control funds and settings; posting grants cannot transfer funds (HF28).

Full protocol reference: [hive-account-authority.md](../../../../../../spec/hive-account-authority.md).

## Entry

Logged-in account menu → **Permissions** (after Wallet). Other profiles are viewable; grant/revoke only when `viewer === profile`.

## Grant / revoke

1. Server action loads live `condenser_api.get_accounts` (never indexer snapshot).
2. `mergeHiveAccountAuths` + `buildAccountUpdateAuthorityOp`.
3. Web wallet facade broadcasts with **Active** key. Keychain/HAS send the wire op as JSON. HiveSigner redirects to `/sign/account_update` with `posting`/`active` **JSON-encoded** in the query (see [auth.md](../../../auth.md) signing).

After success: `revalidateUserPermissionsAfterBroadcast` invalidates authority list cache tags.

## Module

`apps/web/src/modules/user-permissions/`
