# Component spec: Advanced reports table (WalletTable)

## parent_context

- [../page-spec.md](../page-spec.md) — routes `/transfers/table`, `/transfers/details/:reportId` (and via switcher for WAIV)
- [hive-wallet.md](hive-wallet.md) — navigates here from HIVE wallet
- [wallet-table-switcher.md](wallet-table-switcher.md) — embeds WAIV variant

## Role

Full-width **spreadsheet-style** transaction report with filters (unless saved report), **totals**, **CSV export**, **infinite load more**, row **exclude-from-total** checkboxes.

## Contains

- Back link navigation (to wallet or generated reports — see implementation)
- TableFilter — *not a separate spec file*
- DynamicTbl body — *not a separate spec file*

## Entry routes

| Route | tableType | Filters |
|-------|-----------|---------|
| `/@name/transfers/table` | HIVE | Full TableFilter |
| `/@name/transfers/waiv-table?tab=standard` | WAIV | Via [wallet-table-switcher.md](wallet-table-switcher.md) |
| `/@name/transfers/details/:reportId` | From report | `withoutFilters` |

## Global chrome

On mount: **`globalTableMode`** on (`openWalletTable`). On unmount: off + reset report data. See [page-spec.md](../page-spec.md).

## emits_to_parent

- `close_table_mode` on unmount (concept) — Redux `closeWalletTable`.
- Row checkbox → `calculate_total_changes` in advanced report store.

## integration_contract

```yaml
integration_contract:
  input_data:
    - filter_accounts
    - date_range
    - currency
    - exclude_swaps_flag
    - report_id_when_details
  emitted_actions:
    - fetch_report_page
    - load_more_rows
    - export_csv
  controlled_by_page_state:
    - global_table_mode
    - advanced_report_store
```

## References

- [../page-spec.md](../page-spec.md) — layout and `globalTableMode`
- [hive-wallet.md](hive-wallet.md) — HIVE navigation source
- [wallet-table-switcher.md](wallet-table-switcher.md) — WAIV wrapper + Standard tab
- [wallets-root.md](wallets-root.md) — wallet context before table
