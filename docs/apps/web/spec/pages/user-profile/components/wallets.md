# Wallets (UserWallet)

## metadata

| field | value |
|-------|-------|
| name | Wallets |
| source | `src/client/wallet/Wallets.js` |
| type | Connected + injectIntl |

## structure

- Ant Design `Tabs` with WAIV / HIVE / ENGINE / rebalancing panes; modal hosts for wallet operations.

## inputs

- `match.params.name`, `location.search`, `authUserName`, intl.

## state

- Parses `type` from query; guest and current-user checks.

## actions

- `setWalletType`, balance loaders, modal-related from wallet and swap stores.

## rendering

- Conditional tab content per `type`.

## emitted events

- Wallet operations opening modals (withdraw, delegate, etc.).

## References

- [../routes/transfers/page-spec.md](../routes/transfers/page-spec.md)
- [../tabs/wallet-type-tabs.md](../tabs/wallet-type-tabs.md)
- [../modals/transfer-and-wallet-modals.md](../modals/transfer-and-wallet-modals.md)

```yaml
integration_contract:
  input_data: name, query type, auth, guest flags.
  emitted_actions: setWalletType, balance fetches, modal toggles.
  controlled_by_state: wallet + swap + deposit/withdraw selectors.
  affected_by_route: transfers.
  affected_by_query: type.
```
