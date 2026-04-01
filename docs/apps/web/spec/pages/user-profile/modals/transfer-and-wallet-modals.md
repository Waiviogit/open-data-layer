# Transfer and wallet modals

## Trigger

- **Transfer:** `openTransfer` from [`User`](../components/user.md) (`User.js`) and flows inside [`Wallets`](../components/wallets.md).
- **Withdraw / Deposit / Swap / Power / Delegate:** Visibility flags from Redux selectors in `Wallets.js` (`getIsTransferVisible`, `getDepositVisible`, `getVisibleModal`, `getVisibleConvertModal`, delegation, RC modals — see imports in `src/client/wallet/Wallets.js`).

## parent_contexts

- Profile shell [`page-spec.md`](../page-spec.md).
- Wallet routes: [transfers](../routes/transfers/page-spec.md), [transfers-table](../routes/transfers-table/page-spec.md), [transfers-waiv-table](../routes/transfers-waiv-table/page-spec.md), [transfers-details](../routes/transfers-details/page-spec.md).

## states

- Redux: `walletStore`, `swapStore`, `depositeWithdrawStore`, delegate modal selectors.

## result

- User confirms/cancels transfers, withdrawals, swaps; UI closes modals and refreshes balances where implemented.

## References

- [../components/wallets.md](../components/wallets.md)
- [../components/user.md](../components/user.md)
- [../routes/transfers/page-spec.md](../routes/transfers/page-spec.md)

```yaml
integration_contract:
  input_data: Modal visibility flags, account name, token context.
  emitted_actions: Chain transactions, close modal, refresh balances.
  controlled_by_state: wallet + swap + deposit/withdraw Redux.
  affected_by_route: transfers subtree when Wallets mounted.
  affected_by_query: wallet type query on parent transfers route.
```
