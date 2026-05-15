# Object followers list (primary tab)

**Back:** [web spec overview](./overview.md)

## Route

- **URL:** `/object/[object-id]/followers` (optional `?sort=`). The path stays in the address bar; {@link apps/web/src/proxy.ts} rewrites internally to `/object/[object-id]?tab=followers` (existing query preserved).
- **App files:** `apps/web/src/app/(app)/object/[object-id]/page.tsx`, `object-page-client.tsx`, `followers/object-followers.actions.ts`
- **UI:** reuses {@link apps/web/src/modules/user-social/presentation/components/user-social-account-list.tsx} in the object profile **center column** when the **Followers** primary tab is active.

## Data

- **API:** `GET /query/v1/objects/:objectId/followers` (query-api) via {@link apps/web/src/modules/object/infrastructure/clients/object-social.client.ts}.
- **Query:** `sort` (`rank` \| `followers` \| `a-z` \| `recency`), `skip`, `limit` — same contract as user `/followers` (see [query-api user social lists](../query-api/spec/user-social-lists.md)).
- **Headers:** optional `X-Viewer` (cookie auth) for `isCurrentFollowing` on each row.

## UX

- **Sort** is driven by `?sort=` and {@link apps/web/src/modules/user-social/presentation/components/user-social-subscription-sort.tsx} (`router.replace` on the current pathname).
- **Load more:** server action accumulates pages with {@link apps/web/src/modules/user-social/constants}.
