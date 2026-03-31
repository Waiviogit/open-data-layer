# Component spec: Wallet action (WalletAction)

## parent_context

**Shared component** — referenced by multiple parents (not owned by a single page file).

## parent_contexts (modal / dispatch consumers)

- [hive-wallet-summary.md](hive-wallet-summary.md) — HIVE token rows
- [waiv-wallet.md](waiv-wallet.md) — WAIV summary (via WAIVWalletSummaryInfo)
- [wallets-root.md](wallets-root.md) — hosts resulting global modals

## Role

Reusable **primary button + optional dropdown** for wallet operations. Maps **action keys** to Redux **modal open** or **transfer** dispatchers.

## Placement

Used in HIVE summary blocks, WAIV summary, RC block — only when **profile owner is the authenticated user** (`useRouteMatch().params.name === authenticated username`). Otherwise returns **null** (no actions).

## Structure

- Optional **primary** `Button` (`mainKey`) — label from intl id = key name.
- If secondary options exist: **Dropdown** (`trigger: click`, `placement: bottomRight`) with caret button.

## emits_to_parent (Redux / callbacks)

| Conceptual emission | Resolves in |
|---------------------|-------------|
| `open_transfer_modal` | [../modals/global-wallet-modals.md](../modals/global-wallet-modals.md) (Transfer) |
| `open_power_up_or_down_modal` | global-wallet-modals (PowerUpOrDown) |
| `open_swap_modal` | global-wallet-modals (SwapTokens) |
| `open_convert_hbd_modal` | global-wallet-modals (ConvertHbdModal) |
| `open_deposit_modal` | global-wallet-modals (Deposit) |
| `open_withdraw_modal` | global-wallet-modals (WithdrawModal) / Hive withdraw |
| `toggle_delegate_modal` | global-wallet-modals (ManageDelegate / DelegateModal) |
| `open_delegate_rc_modal` | global-wallet-modals (DelegateRcModal) |
| `open_manage_rc_modal` | global-wallet-modals (ManageRcDelegations) |
| `open_details_callback` | Parent local state — [../modals/hive-summary-modals.md](../modals/hive-summary-modals.md) (DelegateListModal) |

## Action key → behavior (conceptual)

See original table in prior revision (power_up, transfer, withdraw, …). All affect **global** Redux except `details` which calls parent callback.

## integration_contract

```yaml
integration_contract:
  input_data:
    - main_key
    - main_currency
    - options_list
    - route_match_profile_name
    - auth_username
  emitted_actions:
    - redux_dispatches_listed_above
    - optional_parent_open_details_modal
  controlled_by_page_state:
    - visibility_rule_owner_only
```

## References

- [../modals/global-wallet-modals.md](../modals/global-wallet-modals.md) — target for most dispatches
- [../modals/hive-summary-modals.md](../modals/hive-summary-modals.md) — DelegateListModal opened via parent callback / click on values
- [../modals/waiv-summary-modals.md](../modals/waiv-summary-modals.md) — WAIV delegate list / power modals
- [hive-wallet-summary.md](hive-wallet-summary.md) — HIVE embedder
- [waiv-wallet.md](waiv-wallet.md) — WAIV embedder
- [wallets-root.md](wallets-root.md) — global modal host
