# Modal group: WAIV wallet summary (local modals)

## parent_contexts

- [../components/waiv-wallet.md](../components/waiv-wallet.md) — **primary** (WAIVWalletSummaryInfo)
- [../components/wallets-root.md](../components/wallets-root.md) — wallet tab host

## Context

Managed inside **WAIVWalletSummaryInfo** with local React state. Transfer/power/delegate **also** use global modals: [global-wallet-modals.md](global-wallet-modals.md).

## Modals (index)

| Modal | Trigger |
|-------|---------|
| **DelegateListModal** (WP) | Click WAIV delegations row when lists non-empty |
| **PowerDownProgressModal** | Click power-down amount (WAIV unstake) — `isWaivWallet` |
| **CancelPowerDownModal** | Cancel on power-down row — `isWaivWallet` |

## emits_to_parent

- Local visibility toggles only; chain actions on confirm.

## integration_contract

```yaml
integration_contract:
  input_data:
    - delegate_lists_wp
    - unstake_token_records
  emitted_actions:
    - broadcast_or_refresh_balances
  controlled_by_page_state:
    - local_modal_flags_waiv_summary
```

## References

- [../components/waiv-wallet.md](../components/waiv-wallet.md) — parent tab body
- [../components/wallet-actions.md](../components/wallet-actions.md) — WP/HIVE actions
- [global-wallet-modals.md](global-wallet-modals.md) — shared transfer/power/delegate
- [../page-spec.md](../page-spec.md) — page shell
