# Modal group: HIVE wallet summary (local modals)

## parent_contexts

- [../components/hive-wallet-summary.md](../components/hive-wallet-summary.md) — **primary** (state lives in summary tree)
- [../components/hive-wallet.md](../components/hive-wallet.md) — parent route body containing summary

## Context

Rendered **inside** `UserWalletSummary` (or conditional fragments). State is mostly **local React state** on the summary component; **WalletAction**-driven flows still use **global** modals in [global-wallet-modals.md](global-wallet-modals.md).

## Modals (index)

| Modal | Trigger | Spec tie-in |
|-------|---------|-------------|
| **DelegateListModal** (HP) | Click delegations value when lists exist; lists from API | Opened from summary |
| **DelegateListModal** (RC) | Click RC delegations row | Opened from summary |
| **RC info Modal** (antd) | Click max RC value in `RcBlock` | Inline in RC block |
| **CancelPowerDownModal** | Cancel on power-down row | — |
| **PowerDownProgressModal** | Click power-down amount | — |
| **CancelWithdrawSavings** | Cancel pending savings withdraw | — |
| **SavingsProgressModal** | Click pending withdraw amount; conversion variant for HIVE/HBD conversions | — |

## emits_to_parent

- Local modals: **no Redux** for visibility (local `useState`).
- After confirm: chain refresh / parent callbacks may refetch user account.

## integration_contract

```yaml
integration_contract:
  input_data:
    - delegation_lists
    - savings_withdraw_records
    - conversion_records
    - rc_account_payload
  emitted_actions:
    - refetch_user_optional
  controlled_by_page_state:
    - local_visible_flags_on_summary
```

## References

- [../components/hive-wallet-summary.md](../components/hive-wallet-summary.md) — owner UI block
- [../components/hive-wallet.md](../components/hive-wallet.md) — tab parent
- [../components/wallet-actions.md](../components/wallet-actions.md) — global modal triggers alongside these
- [global-wallet-modals.md](global-wallet-modals.md) — HP/RC delegate via WalletAction
- [../page-spec.md](../page-spec.md) — page shell
