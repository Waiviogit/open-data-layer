# Component spec: HIVE wallet summary (UserWalletSummary)

## parent_context

- [hive-wallet.md](hive-wallet.md) — HIVE wallet tab body
- [../page-spec.md](../page-spec.md) — page shell

## Role

Stack of **token and staking rows** for HIVE, HP, savings, HBD, RC, conversions, plus **estimated account value** and (mobile) **wallet sidebar** shortcuts. Triggers **local modals** and dispatches actions resolved by **global modals**.

## Contains (logical blocks — all specified here)

- HIVE liquid row + [wallet-actions.md](wallet-actions.md)
- HIVE Power + PowerDown + Delegate + RC sub-blocks + [wallet-actions.md](wallet-actions.md)
- HIVE Savings + [wallet-actions.md](wallet-actions.md)
- HBD liquid + [wallet-actions.md](wallet-actions.md)
- HBD Savings + Interest + [wallet-actions.md](wallet-actions.md)
- Est. account value row (wrapper `WalletSummaryInfo` concept)
- Mobile wallet sidebar shortcuts — *not a separate spec file*

## emits_to_parent

- Redux dispatches from [wallet-actions.md](wallet-actions.md): e.g. `open_transfer`, `toggle_delegate_modal`, `open_power_up_or_down` (conceptual names) — consumed by [wallets-root.md](wallets-root.md) + [../modals/global-wallet-modals.md](../modals/global-wallet-modals.md)
- Local modal open state: [../modals/hive-summary-modals.md](../modals/hive-summary-modals.md) (delegation lists, savings progress, RC info modal inside RC block)

## integration_contract

```yaml
integration_contract:
  input_data:
    - profile_user_account_view
    - global_vesting_totals
    - rc_and_delegation_api_payloads
    - savings_withdraw_records
  emitted_actions:
    - redux_wallet_modals_from_wallet_actions
    - local_modal_set_visible
  controlled_by_page_state:
    - is_auth_viewer_owner_of_profile
```

## Wallet actions visibility

`WalletAction` only when **viewing own profile** — see [wallet-actions.md](wallet-actions.md).

## References

- [hive-wallet.md](hive-wallet.md) — parent HIVE tab
- [wallet-actions.md](wallet-actions.md) — primary + dropdown actions
- [../modals/hive-summary-modals.md](../modals/hive-summary-modals.md) — local dialogs (lists, progress, cancel)
- [../modals/global-wallet-modals.md](../modals/global-wallet-modals.md) — global dialogs triggered via WalletAction
- [../page-spec.md](../page-spec.md) — page shell
