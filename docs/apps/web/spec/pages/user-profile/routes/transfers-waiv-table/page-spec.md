# Transfers — WAIV table (standard / generated)

## route_path

- `/@:name/transfers/waiv-table`

**Router:** `path: '/transfers/(waiv-table)'` → `WalletTableSwitcher`.

## parent_route

[page-spec.md](../../page-spec.md).

## child_routes

None.

## route_params

- `name`

## query_params

- `tab` — `standard` | `generate` (and related). Drives **active tab** in `WalletTableSwitcher`, `TableFilter`, `GenerateReport`. Affects **layout** (which table UI) and **data**.

## layout

On mount, `useEffect` dispatches `openWalletTable()` — sidebars hidden per shell rules.

## route_region_impact

| region | impact |
|--------|--------|
| left-sidebar | Hidden (wallet table mode). |
| center | Tabs: Standard (`BothWalletTable`) vs Generated reports. |
| right-sidebar | Hidden. |

## navigation

Links like `/@:name/transfers/waiv-table?tab=standard` and `?tab=generate`.

## visible_blocks

| block | file path |
|-------|-----------|
| WalletTableSwitcher | `src/client/wallet/WalletTable/WalletTableSwitcher.js` |
| BothWalletTable | `src/client/wallet/WalletTable/BothWalletTable.js` |
| GenerateReport | `src/client/wallet/WalletTable/GenerateReport.js` |
| TableFilter | `src/client/wallet/WalletTable/TableFilter.js` |

## actions

`openWalletTable`, advanced report actions (`generateReports`, `getHistoryReports`, etc.).

## state_model

Query `tab` + Redux advanced reports.

## loading_behavior

Loading in `GenerateReport` and table components.

## conditional_visibility

Generated tab only for `authUser === name`.

## child_route_integration

[transfers](../transfers/page-spec.md) parent; modals in Generate flow.

## References

- [../../page-spec.md](../../page-spec.md)
- [../transfers/page-spec.md](../transfers/page-spec.md)
- [../../components/wallet-table-switcher.md](../../components/wallet-table-switcher.md)
- [../../tabs/waiv-table-tabs.md](../../tabs/waiv-table-tabs.md)
- [../../modals/transfer-and-wallet-modals.md](../../modals/transfer-and-wallet-modals.md)

```yaml
integration_contract:
  input_data: name, query tab, auth user.
  emitted_actions: openWalletTable, report CRUD actions.
  controlled_by_state: advancedReports store + query tab.
  affected_by_route: transfers/waiv-table.
  affected_by_query: tab.
```
