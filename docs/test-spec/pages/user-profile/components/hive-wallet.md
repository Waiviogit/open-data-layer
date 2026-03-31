# Component spec: HIVE wallet tab (UserWallet)

## parent_context

- [../page-spec.md](../page-spec.md) — route `/transfers` body (HIVE pane)
- [wallets-root.md](wallets-root.md) — wallet tab host

## Role

Displays **HIVE ecosystem wallet** for the profile: summary blocks, **Advanced reports** navigation, **transaction history** with infinite scroll, and conditional **withdraw** UI.

## Contains

- [hive-wallet-summary.md](hive-wallet-summary.md) — token rows, RC, savings, HBD, interest
- [wallet-actions.md](wallet-actions.md) — embedded in summary rows (via hive-wallet-summary)
- Transaction list (infinite scroll) — *logical block inside this spec; not a separate file*
- [../modals/hive-summary-modals.md](../modals/hive-summary-modals.md) — modals opened from summary rows
- Link/navigation to [wallet-table.md](wallet-table.md) — HIVE advanced reports

## Data sources (conceptual)

| Mode | History source | Notes |
|------|----------------|-------|
| Registered user | Blockchain-style transaction history for profile name | Paginated / operation cursor |
| Guest account | Demo / guest “actions” list | Different list + has-more semantics |

## Loading states

| State | UI |
|-------|-----|
| Initial history loading | Spinner in transaction area (not full page) |
| Load more | Inline loader at list bottom via infinite scroll |

## Empty state

Message: no transactions yet (localized).

## Interactions

| Action | Where | Immediate UI | Modal / nav | State |
|--------|-------|--------------|-------------|-------|
| Open Advanced reports | Text control | — | Navigate to `/@name/transfers/table` | Router + `globalTableMode` |
| Infinite scroll | List | Loader at bottom | — | Fetch more |
| Wallet row actions | Summary | — | Global modals via [wallet-actions.md](wallet-actions.md) | Redux |

## emits_to_parent

- Navigates to advanced table — **no custom event**; uses router `history.push` to table route.
- Summary blocks dispatch modal opens consumed by [wallets-root.md](wallets-root.md).

## integration_contract

```yaml
integration_contract:
  input_data:
    - profile_username
    - chain_history_cursor
    - guest_mode_flag
  emitted_actions:
    - fetch_more_history
    - clear_history_on_unmount_unless_table_route
  controlled_by_page_state:
    - users_account_history_loading
    - withdraw_modal_flag
```

## References

- [../page-spec.md](../page-spec.md) — parent page
- [wallets-root.md](wallets-root.md) — wallet tabs host
- [hive-wallet-summary.md](hive-wallet-summary.md) — summary blocks
- [wallet-actions.md](wallet-actions.md) — action control
- [wallet-table.md](wallet-table.md) — HIVE advanced reports destination
- [../modals/hive-summary-modals.md](../modals/hive-summary-modals.md) — summary-triggered modals
- [../modals/global-wallet-modals.md](../modals/global-wallet-modals.md) — actions that open global dialogs
