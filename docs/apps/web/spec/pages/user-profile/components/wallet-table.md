# BothWalletTable (WalletTable route)

## metadata

| field | value |
|-------|-------|
| name | BothWalletTable |
| source | `src/client/wallet/WalletTable/BothWalletTable.js` |
| type | Wallet table container |

## structure

- Wraps table UI for combined chains; used by table route and switcher standard tab.

## inputs

- Props from parent switcher or route.

## state

- Table filters and data from advanced reports / wallet.

## actions

- `openWalletTable` when entering table flows.

## rendering

- Data grid with filters.

## emitted events

- Fetch transactions, export, etc.

## References

- [../routes/transfers-table/page-spec.md](../routes/transfers-table/page-spec.md)
- [../modals/transfer-and-wallet-modals.md](../modals/transfer-and-wallet-modals.md)

```yaml
integration_contract:
  input_data: User name, report context.
  emitted_actions: Transaction fetches, openWalletTable.
  controlled_by_state: advancedReports + wallet.
  affected_by_route: transfers/table, waiv-table standard tab.
  affected_by_query: internal table filters.
```
