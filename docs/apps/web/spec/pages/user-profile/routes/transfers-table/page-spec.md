# Transfers — table (both chains)

## route_path

- `/@:name/transfers/table`

**Router:** `path: '/transfers/(table)'` → `WalletTable` (`BothWalletTable` via `routes/components.js`).

## parent_route

[page-spec.md](../../page-spec.md).

## child_routes

None.

## route_params

- `name`

## query_params

Inherits wallet ecosystem; table views may use filters internal to `BothWalletTable` / `WalletTable` (see component code).

## layout

`openWalletTable()` dispatch typically used from related flows — when `isOpenWalletTable` is true, **User** hides sidebars and expands center (`display-table`).

## route_region_impact

| region | impact |
|--------|--------|
| left-sidebar | Hidden when wallet table mode active. |
| center | Full-width table. |
| right-sidebar | Hidden when wallet table mode active. |

## navigation

Reached from wallet/table flows (not primary UserMenu top link).

## visible_blocks

| block | file path |
|-------|-----------|
| BothWalletTable | `src/client/wallet/WalletTable/BothWalletTable.js` |

## actions

`openWalletTable` from `walletActions`; table data via advanced report / wallet APIs per implementation.

## state_model

`isOpenWalletTable` in Redux.

## loading_behavior

Table loading states inside wallet table components.

## conditional_visibility

N/A.

## child_route_integration

See [transfers](../transfers/page-spec.md) and [transfers-waiv-table](../transfers-waiv-table/page-spec.md).

## References

- [../../page-spec.md](../../page-spec.md)
- [../transfers/page-spec.md](../transfers/page-spec.md)
- [../../components/wallet-table.md](../../components/wallet-table.md)
- [../../modals/transfer-and-wallet-modals.md](../../modals/transfer-and-wallet-modals.md)

```yaml
integration_contract:
  input_data: name, openWalletTable flag.
  emitted_actions: openWalletTable, table transactions fetch.
  controlled_by_state: isOpenWalletTable, wallet/advanced report state.
  affected_by_route: transfers/table.
  affected_by_query: component-internal filters.
```
