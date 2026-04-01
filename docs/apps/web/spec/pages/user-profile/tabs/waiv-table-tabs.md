# WAIV table tabs (standard / generated)

## tabs

Standard, Generated (auth user only) — [`WalletTableSwitcher`](../components/wallet-table-switcher.md).

## active source

- **Query:** `tab` = `standard` | `generate` (see `WalletTableSwitcher.js`, `TableFilter.js`, `GenerateReport.js`).

## switching

- `Link` updates query; `Tabs` `activeKey={tab}`.

## affected region

- **Center** (table vs generate report UI); **sidebars** hidden via `openWalletTable`.

## References

- [../routes/transfers-waiv-table/page-spec.md](../routes/transfers-waiv-table/page-spec.md)
- [../components/wallet-table-switcher.md](../components/wallet-table-switcher.md)

```yaml
integration_contract:
  input_data: query tab, name, authUser.
  emitted_actions: openWalletTable on mount; navigate tab.
  controlled_by_state: Query tab.
  affected_by_route: transfers/waiv-table.
  affected_by_query: tab.
```
