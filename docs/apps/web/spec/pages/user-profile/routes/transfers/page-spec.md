# Transfers (wallet)

## route_path

- `/@:name/transfers`

**Router:** `path: '/transfers'` → `Wallets` (exported as `UserWallet` in `routes/components.js`).

## parent_route

[page-spec.md](../../page-spec.md).

## child_routes

Sibling routes: [transfers-table](../transfers-table/page-spec.md), [transfers-waiv-table](../transfers-waiv-table/page-spec.md), [transfers-details](../transfers-details/page-spec.md).

## route_params

- `name` — profile whose wallet is shown.

## query_params

- `type` — **required for tab content:** `WAIV` | `HIVE` | `ENGINE` | `rebalancing`. Default entry from menu: `?type=WAIV`. Affects **data** and **visible tab** in `Wallets.js`.

## layout

Standard shell unless user navigates to wallet table routes (see wallet table state).

## route_region_impact

| region | impact |
|--------|--------|
| left-sidebar | Visible on base transfers (not when nested table mode hides shell). |
| center | Tabbed wallet (WAIV / HIVE / Hive Engine / rebalancing). |
| right-sidebar | Visible. |

## navigation

[UserMenu](../../components/user-menu.md): `/@:name/transfers?type=WAIV`.

## visible_blocks

| block | file path |
|-------|-----------|
| Wallets | `src/client/wallet/Wallets.js` |
| WAIVwallet, Wallet (Hive), HiveEngineWallet, Rebalancing | under `src/client/wallet/` |

## actions

Wallet actions: balances, `setWalletType`, modals — see [modals/transfer-and-wallet-modals.md](../../modals/transfer-and-wallet-modals.md).

## state_model

- Query `type` synced to wallet type in effects.
- Redux wallet + swap + deposit/withdraw visibility.

## loading_behavior

Per-token loaders inside subtabs.

## conditional_visibility

Guest: Hive Engine / some tabs hidden. Rebalancing only for current user match.

## child_route_integration

`User` shell `openTransfer(name)` from hero; table routes use `openWalletTable` Redux.

## References

- [../../page-spec.md](../../page-spec.md)
- [../transfers-table/page-spec.md](../transfers-table/page-spec.md)
- [../transfers-waiv-table/page-spec.md](../transfers-waiv-table/page-spec.md)
- [../transfers-details/page-spec.md](../transfers-details/page-spec.md)
- [../../components/wallets.md](../../components/wallets.md)
- [../../tabs/wallet-type-tabs.md](../../tabs/wallet-type-tabs.md)
- [../../modals/transfer-and-wallet-modals.md](../../modals/transfer-and-wallet-modals.md)

```yaml
integration_contract:
  input_data: name, query type, auth user name, guest flags.
  emitted_actions: setWalletType, balance fetches, modal toggles.
  controlled_by_state: wallet store + query type.
  affected_by_route: transfers base path.
  affected_by_query: type (wallet tab).
```
