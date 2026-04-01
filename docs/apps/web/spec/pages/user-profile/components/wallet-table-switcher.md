# WalletTableSwitcher

## metadata

| field | value |
|-------|-------|
| name | WalletTableSwitcher |
| source | `src/client/wallet/WalletTable/WalletTableSwitcher.js` |
| type | Functional + injectIntl |

## structure

- `Tabs` with `Link` to `?tab=standard` and `?tab=generate`; mounts `BothWalletTable` or generate flow.

## inputs

- `name` from `useParams`, `tab` from `useQuery`.

## state

- Dispatches `openWalletTable` on mount.

## actions

- `openWalletTable`.

## rendering

- Second tab only if `authUser === name`.

## emitted events

- Full-screen table mode via Redux.

## References

- [../routes/transfers-waiv-table/page-spec.md](../routes/transfers-waiv-table/page-spec.md)
- [../tabs/waiv-table-tabs.md](../tabs/waiv-table-tabs.md)
- [../modals/transfer-and-wallet-modals.md](../modals/transfer-and-wallet-modals.md)

```yaml
integration_contract:
  input_data: name, query tab, auth user.
  emitted_actions: openWalletTable, navigate tab links.
  controlled_by_state: query tab + auth.
  affected_by_route: transfers/waiv-table.
  affected_by_query: tab.
```
