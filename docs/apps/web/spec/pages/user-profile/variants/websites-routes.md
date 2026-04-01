# Websites route config variant

**Source:** `src/routes/configs/websitesRoutes.js` (user subtree).

Compared to `src/routes/configs/routes.js` (lines 402–479), the websites config exposes a **reduced** `/@:name` tree:

- **Parent path patterns** omit `userShop`, `recipe`, `favorites`, `map`, and the broader `URL.USER.tabs` optional segment shape differs (`waiv-table|table` only; no `:departments` in the same way).
- **Child routes present:** default/feed subset (`''`, `comments`, `activity` only—not `threads`/`mentions` in the same way as main), `followers|following|following-objects`, `reblogs`, full `transfers` subtree (`transfers`, `transfers/table`, `transfers/waiv-table`, `transfers/details/:reportId`), `expertise-hashtags|expertise-objects`, `about`.
- **Not available** on websites config (verify file before relying): `userShop`, `recipe`, `favorites`, `map`, and feed tabs `threads`/`mentions` as wired in main `routes.js`.

**References**

- Parent spec: [page-spec.md](../page-spec.md)

```yaml
integration_contract:
  input_data: Same `User` shell; route match set differs by build.
  emitted_actions: None (documentation only).
  controlled_by_state: Build-time route config.
  affected_by_route: Subset of child paths under /@:name.
  affected_by_query: Same query rules as main where routes overlap.
```
