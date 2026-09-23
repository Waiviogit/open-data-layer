---
id: web-business-overview
title: Business (OBL) UI
description: Private `/business` area and offer/request discovery for Open Business Layer.
type: spec
status: active
scope: web
tags: [web, business, obl]
updated_at: 2026-07-16
related:
  - docs/apps/web/spec/overview.md
  - docs/spec/open-business-layer.md
  - docs/apps/query-api/spec/obl.md
  - docs/apps/web/spec/theme.md
---

# Business (OBL) UI

**Back:** [web overview](../overview.md) · **Platform:** [Open Business Layer](../../../../spec/open-business-layer.md) · **API:** [query-api OBL](../../../query-api/spec/obl.md)

## Purpose

**Business** workspace for OBL: public discover catalog, private offer/request management, mutual-ledger relationships, invoices, payments, and disputes.

Implementation module: `apps/web/src/modules/business/`.

Hub chrome: `/business*` lives under `(app)/(hub)` with FEED / DISCOVER / MARKET section nav (`AppSectionNav`). MARKET is active on these routes. See [home](../home/page.md). Public `/offers` and `/requests` discovery routes stay outside the hub group (no section nav).

## Theme tokens (mandatory)

All Business UI styling uses semantic tokens from [`apps/web/src/styles/theme.css`](../../../../../../apps/web/src/styles/theme.css). The file header documents mandatory rules (no raw hex, no default Tailwind scale). See [theme.md](../theme.md) and [apps/web/AGENTS.md](../../../../../../apps/web/AGENTS.md).

PR review: reject `#…`, `rgb(`, `text-sm`/`text-lg`, `rounded-md`, or inline colors unless listed as an AGENTS.md exception.

## Auth

| Area | Gate |
|------|------|
| `/business/manage/**` | `requireBusinessUser()` → redirect `/sign-in` |
| `/business/relationships/**`, `/business/arbitration`, `/business/contracts/**`, `/business/invoices/**`, `/business/disputes/**`, `/business/service-orders/**`, `/business/reports/**` | `requireBusinessUser()` |
| `/business`, `/business/offers`, `/business/requests` (discover) | Public |
| `/offers/.../versions/:v`, `/requests/.../versions/:v` | Public read; sign requires wallet session |

Discover stays on the section nav (Feed / Discover / Market). Logged-in account menu → **Orders** opens `/business/relationships` (`logged-in-header-actions.tsx`).

## Route map

| Route | Role |
|-------|------|
| `/business` | Redirect → `/business/offers` |
| `/business/offers`, `/business/requests` | Discover catalog (`?author=`, `?q=`); Offers / Requests tab links |
| `/business/manage/offers/drafts` \| `published` \| `retired` | Private offer management |
| `/business/manage/requests/drafts` \| `published` \| `retired` | Private request management |
| `/business/manage/offers/new`, `/business/manage/requests/new` | Create draft → editor |
| `/business/manage/offers/drafts/:draftId` | 8-step editor, autosave, publish |
| `/business/manage/offers/:offerId` | Owner detail, retire, new version |
| `/business/manage/offers/:offerId/versions/:version` | Authenticated version read / sign |
| `/business/relationships` | Counterparty list |
| `/business/arbitration` | Arbiter dispute inbox ([arbitration.md](arbitration.md)) |
| `/business/relationships/:account` | Balance cards + tabs |
| `/business/contracts/:contractId` | Contract drill-down |
| `/business/invoices/:invoiceId` | Invoice drill-down |
| `/business/service-orders/:serviceOrderId` | Service order drill-down |
| `/business/reports/:reportId` | Report drill-down |
| `/business/disputes/:disputeId` | Dispute drill-down |
| `/offers`, `/requests` | Redirect → discover |
| `/offers/:id/versions/:v`, `/requests/:id/versions/:v` | Public sign + disclosures |
| `/business/offers/*`, `/business/requests/*` (legacy manage paths) | Redirect → `/business/manage/...` |

Path builders: `modules/business/domain/routes.ts`.

## Data paths

| Concern | Path |
|---------|------|
| Draft CRUD | Server Actions → `GET/PATCH /query/v1/users/:author/obl-drafts` |
| Offers read | `obl-offers.server.ts` → query-api |
| Ledger / relationships | `obl-ledger.server.ts` |
| Broadcast | `useOblBroadcast` + `useOblCustomJsonId` + `@opden-data-layer/hive-broadcast` |
| USD→WAIV (client) | BFF `GET /api/business/convert-usd-to-waiv` |

Child specs: [offers.md](offers.md), [relationships.md](relationships.md), [arbitration.md](arbitration.md), [blockchain-actions.md](blockchain-actions.md).

## Verification

```bash
pnpm nx run web:typecheck
pnpm check:web-i18n-utf8
pnpm nx test web -- --testPathPatterns=business
pnpm nx run web:verify-production-build
```
