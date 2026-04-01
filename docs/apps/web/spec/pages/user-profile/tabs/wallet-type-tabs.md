# Wallet type tabs (WAIV / HIVE / Engine / Rebalancing)

## tabs

WAIV, HIVE, Hive Engine (non-guest), Rebalancing (current user only) — [`Wallets`](../components/wallets.md).

## active source

- **Query:** `type` = `WAIV` | `HIVE` | `ENGINE` | `rebalancing`. `Tabs` `onChange` calls `setWalletType`; links embed `?type=`.

## switching

- **Query + route:** same path `/@:name/transfers` with different `type`.

## affected region

- **Center** wallet panel.

## References

- [../routes/transfers/page-spec.md](../routes/transfers/page-spec.md)
- [../components/wallets.md](../components/wallets.md)

```yaml
integration_contract:
  input_data: query type, name, guest flags.
  emitted_actions: setWalletType, load subtabs.
  controlled_by_state: Query + wallet store.
  affected_by_route: transfers.
  affected_by_query: type.
```
