# Transfers — details (report drill-down)

## route_path

- `/@:name/transfers/details`
- `/@:name/transfers/details/:reportId`

**Router:** `path: '/transfers/(details)/:reportId?'` → `DetailsTable`.

**Note:** Parent route pattern in `routes.js` line 406 also references `:recordId` in an alternate top-level pattern; the nested route param used in `DetailsTable` is **`reportId`** (`useParams()` in `DetailsTable.js`).

## parent_route

[page-spec.md](../../page-spec.md).

## child_routes

None.

## route_params

- `name`
- `reportId` — report identifier for advanced report details.

## query_params

None required at route level.

## layout

Wallet table presentation; `WalletTable` used with `withoutFilters` prop pattern.

## route_region_impact

| region | impact |
|--------|--------|
| left-sidebar | May hide when wallet table mode active depending on entry. |
| center | `DetailsTable` wrapping `WalletTable`. |
| right-sidebar | Same as shell rules for wallet views. |

## navigation

From generated reports / history flows.

## visible_blocks

| block | file path |
|-------|-----------|
| DetailsTable | `src/client/wallet/WalletTable/DetailsTable.js` |
| WalletTable | `src/client/wallet/WalletTable/WalletTable.js` |

## actions

`getReportDetails`, `getMoreReportDetails`, `calculateTotalChangesInDetails` (connected in `DetailsTable`).

## state_model

Redux `advancedReports` for selected report.

## loading_behavior

Table transaction loading per report id.

## conditional_visibility

Requires valid `reportId` for data.

## child_route_integration

[transfers-waiv-table](../transfers-waiv-table/page-spec.md) report generation flow.

## References

- [../../page-spec.md](../../page-spec.md)
- [../transfers/page-spec.md](../transfers/page-spec.md)
- [../../components/details-table.md](../../components/details-table.md)

```yaml
integration_contract:
  input_data: reportId from route, name.
  emitted_actions: load report details, pagination of transactions.
  controlled_by_state: advancedReports.
  affected_by_route: reportId segment.
  affected_by_query: none.
```
