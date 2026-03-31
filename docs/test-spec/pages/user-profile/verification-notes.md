# Verification notes (cross-file linking and grep inventory)

## parent_context

- [page-spec.md](page-spec.md) — **meta document** supporting the spec set (not a UI component)

## Role

Cross-check navigation targets, modal inventory, and **bidirectional** links for reconstruction.

## Navigation strings (wallet-related)

| Source spec | Mechanism | Target |
|-------------|-----------|--------|
| [components/hive-wallet.md](components/hive-wallet.md) | `history.push` | `/@:name/transfers/table` |
| [components/waiv-wallet.md](components/waiv-wallet.md) | `Link` | `/@:name/transfers/waiv-table?tab=standard` |
| [components/wallets-root.md](components/wallets-root.md) | `Link` | `?type=WAIV|HIVE|ENGINE|rebalancing` |
| [components/wallet-table.md](components/wallet-table.md) | `Link` back | wallet or `waiv-table?tab=generate` |
| [components/wallet-table-switcher.md](components/wallet-table-switcher.md) | `Link` | `waiv-table?tab=standard|generate` |

## Supplementary modals (not duplicated in hive/waiv summary specs)

- Hive Engine: AddToken / EditToken — see source tree; link from [modals/global-wallet-modals.md](modals/global-wallet-modals.md) context only.
- **WithdrawModal** nests **QrModal**, **LinkHiveAccountModal** — parent modal: [modals/global-wallet-modals.md](modals/global-wallet-modals.md).

## integration_contract

```yaml
integration_contract:
  input_data: []
  emitted_actions: []
  controlled_by_page_state:
    - n_a_meta_document
```

## References

- [page-spec.md](page-spec.md) — master index and spec graph
- [modals/global-wallet-modals.md](modals/global-wallet-modals.md) — nested withdraw modals
- [components/wallet-table.md](components/wallet-table.md) — back-link behavior
- [components/hive-wallet.md](components/hive-wallet.md) — HIVE → table navigation
- [components/waiv-wallet.md](components/waiv-wallet.md) — WAIV → waiv-table navigation
