# Modal group: Globally mounted wallet modals (Wallets root)

## parent_contexts

- [../components/wallets-root.md](../components/wallets-root.md) — **mount point** (renders modals)
- [../components/wallet-actions.md](../components/wallet-actions.md) — **primary trigger** (Redux dispatch)

Secondary conceptual parents (open same modals from other entry points):

- [../components/hive-wallet-summary.md](../components/hive-wallet-summary.md) — via WalletAction
- [../components/waiv-wallet.md](../components/waiv-wallet.md) — via WalletAction

## Context

Rendered as siblings **after** the main `Tabs` in the wallet root component. Visibility is **100% Redux-driven** (no local `visible` state in parent).

## Modals and triggers (summary)

| Modal | Typical triggers | Inputs (concept) | States | After success |
|-------|------------------|------------------|--------|----------------|
| **Transfer** | WalletAction `transfer`, `transfer_to_saving`, `deposit` | Recipient, amount, currency, memo, savings flags | open, submitting, error | Close; refresh balances / lists |
| **PowerUpOrDown** | `power_up`, `power_down` | Amount, mode | open/loading/error | Close; refresh HP/WP |
| **SwapTokens** | `swap` | Pair, amounts | open/loading/error | Close; refresh |
| **ConvertHbdModal** | `collateralized_convert` | Direction HIVE↔HBD | open/loading/error | Close; refresh |
| **Deposit** | Convert menu → deposit | Asset | open | Flow continues |
| **WithdrawModal** | `withdraw` | Asset, destination | open/loading/error | Close; refresh |
| **ManageDelegate** | `manage`, `delegate` | HP delegation | open | Close; refresh delegations |
| **DelegateRcModal** | `delegate_rc` | RC target/amount | open | Close |
| **ManageRcDelegations** | `manage_rc` | Lists + balances | open | Close |

## Nested modals

**WithdrawModal** may open **QrModal** and **LinkHiveAccountModal** — see [../verification-notes.md](../verification-notes.md).

## integration_contract

```yaml
integration_contract:
  input_data:
    - redux_visibility_flags_per_modal
    - currency_and_pair_context_from_wallet_actions
  emitted_actions:
    - broadcast_transaction_success  # concept
    - close_modal_and_refresh
  controlled_by_page_state:
    - global_redux_only
```

## References

- [../components/wallets-root.md](../components/wallets-root.md) — host component
- [../components/wallet-actions.md](../components/wallet-actions.md) — dispatch mapping
- [../page-spec.md](../page-spec.md) — page shell
- [../components/hive-wallet-summary.md](../components/hive-wallet-summary.md) — embeds triggers
- [../components/waiv-wallet.md](../components/waiv-wallet.md) — embeds triggers
- [../verification-notes.md](../verification-notes.md) — nested withdraw flows
