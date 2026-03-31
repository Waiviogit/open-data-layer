# Component spec: WAIV advanced reports switcher (WalletTableSwitcher)

## parent_context

- [../page-spec.md](../page-spec.md) — route `/transfers/waiv-table`
- [waiv-wallet.md](waiv-wallet.md) — links into Standard tab

## Role

Adds **Standard** vs **Generated** tabs on top of the WAIV `WalletTable`. Mounts **global table mode** on entry.

## Tab system linking

| Tab key | Label | Content spec | Visible |
|---------|-------|--------------|---------|
| `standard` | Standard | [wallet-table.md](wallet-table.md) (WAIV type) | Always |
| `generate` | Generated | GenerateReport — *not a separate spec file* | Owner only |

- **Parent page:** [../page-spec.md](../page-spec.md)

## Contains

- [wallet-table.md](wallet-table.md) — Standard pane (via BothWalletTable)

## emits_to_parent

- `open_wallet_table` on mount — Redux `openWalletTable` (same as [wallet-table.md](wallet-table.md)).

## integration_contract

```yaml
integration_contract:
  input_data:
    - query_tab_param
    - auth_username_vs_profile_name
  emitted_actions:
    - open_wallet_table_global
  controlled_by_page_state:
    - url_query_tab
```

## References

- [../page-spec.md](../page-spec.md) — parent shell
- [wallet-table.md](wallet-table.md) — Standard tab content
- [waiv-wallet.md](waiv-wallet.md) — inbound link from WAIV wallet
