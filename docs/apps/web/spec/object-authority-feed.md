# Object authority feed (primary tab)

**Back:** [web spec overview](./overview.md)

## Route

- **URL:** `/object/[object-id]/authority` with optional `?sub=administrative|ownership` (default `administrative`) and the same `?sort=` as user social lists. {@link apps/web/src/proxy.ts} rewrites to `/object/[object-id]?tab=authority` (existing query preserved).
- **Sub-tabs:** Administrative vs ownership counts come from resolve (`administrative_count`, `ownership_count`); lists are loaded via `GET /query/v1/objects/:id/authority?authority_type=…`.
- **App files:** `apps/web/src/app/(app)/object/[object-id]/page.tsx`, `object-page-client.tsx`, `authority/object-authority.actions.ts`

## Data

- **API:** `GET /query/v1/objects/:objectId/authority` via {@link apps/web/src/modules/object/infrastructure/clients/object-authority.client.ts}.
- **Resolve:** `POST /query/v1/objects/resolve` includes `administrative_count` and `ownership_count` for sub-tab badges.
- **Headers:** optional `X-Viewer` for `isCurrentFollowing` on each row.

## UX

- **Sort:** same `UserSocialSubscriptionSort` + `?sort=` as followers (`router.replace` on current pathname under `/object/.../authority`).
- **Load more:** {@link apps/web/src/app/(app)/object/[object-id]/authority/object-authority.actions.ts} with {@link apps/web/src/modules/user-social/constants}.
- **UI:** {@link apps/web/src/modules/object/presentation/components/object-authority-sub-nav.tsx} + deep {@link apps/web/src/modules/user-social/presentation/components/user-social-account-list.tsx} (`authority_administrative` / `authority_ownership` list kinds).
