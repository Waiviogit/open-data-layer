# Component spec: WAIV wallet tab (WAIVwallet)

## parent_context

- [../page-spec.md](../page-spec.md) — center column wallet area
- [wallets-root.md](wallets-root.md) — WAIV tab pane

## Role

Displays **WAIV** token summary, optional **Show author and curator rewards** toggle, link to **WAIV advanced reports**, and **WAIV transfer list**.

## Contains

- WAIVWalletSummaryInfo (summary rows) — uses [wallet-actions.md](wallet-actions.md)
- [../modals/waiv-summary-modals.md](../modals/waiv-summary-modals.md) — delegate list, power-down modals
- Link to [wallet-table-switcher.md](wallet-table-switcher.md) (standard tab)
- WAIVWalletTransferList — *logical list block in this spec*

## emits_to_parent

- `set_show_rewards` (concept) — checkbox toggles global wallet store flag affecting list.
- WalletAction dispatches → [../modals/global-wallet-modals.md](../modals/global-wallet-modals.md) via same mechanism as HIVE.

## integration_contract

```yaml
integration_contract:
  input_data:
    - profile_username
    - waiv_currency_balance_slice
    - rates_for_est_value
  emitted_actions:
    - get_token_balance
    - set_show_rewards
  controlled_by_page_state:
    - guest_vs_registered
```

## Interactions

| Action | Result |
|--------|--------|
| Toggle rewards checkbox | Updates store; list may refilter |
| Advanced reports link | Navigate to `waiv-table?tab=standard` — see [wallet-table-switcher.md](wallet-table-switcher.md) |
| Wallet actions | Same modal system as HIVE ([wallet-actions.md](wallet-actions.md)) |

## References

- [../page-spec.md](../page-spec.md) — parent page
- [wallets-root.md](wallets-root.md) — wallet tab host
- [wallet-actions.md](wallet-actions.md) — action buttons
- [wallet-table-switcher.md](wallet-table-switcher.md) — advanced reports entry
- [../modals/waiv-summary-modals.md](../modals/waiv-summary-modals.md) — WAIV summary modals
- [../modals/global-wallet-modals.md](../modals/global-wallet-modals.md) — transfer/power/delegate
