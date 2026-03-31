# Component spec: Wallets root (wallet entry)

## parent_context

- [../page-spec.md](../page-spec.md) — center column when `routeSegment === transfers`

## Role

Root of the **Wallet** sub-area. Hosts **wallet-type tabs** (WAIV / HIVE / Hive Engine / Rebalancing) and **globally mounted wallet modals** driven by Redux visibility flags.

## Contains

- Tab system: WAIV / HIVE / ENGINE / Rebalancing (links + conditional panes)
- Modal host for global wallet dialogs — see [../modals/global-wallet-modals.md](../modals/global-wallet-modals.md)
- Pane content:
  - [waiv-wallet.md](waiv-wallet.md) — WAIV tab
  - [hive-wallet.md](hive-wallet.md) — HIVE tab (via wallet entry component tree)
  - Hive Engine wallet — *not a separate spec file* (see [other-profile-routes.md](other-profile-routes.md) / [verification-notes.md](../verification-notes.md))
  - Rebalancing — *not a separate spec file*

## URL

- Base: `/@:name/transfers`
- Query: `?type=WAIV` | `HIVE` | `ENGINE` | `rebalancing`
- Default tab selection in UI reads `walletsType` from query; parent `Tabs` uses `defaultActiveKey={walletsType}` and `onChange` → `setWalletType`.

## Tab system linking

| Tab | Query | Content spec |
|-----|-------|----------------|
| WAIV | `type=WAIV` | [waiv-wallet.md](waiv-wallet.md) |
| HIVE | `type=HIVE` | [hive-wallet.md](hive-wallet.md) |
| Hive Engine | `type=ENGINE` | *(implementation only)* |
| Rebalancing | `type=rebalancing` | *(implementation only)* |

- **Parent page:** [../page-spec.md](../page-spec.md)

## Visibility rules

| Tab | Shown when |
|-----|------------|
| WAIV | Always |
| HIVE | Always |
| Hive Engine | Profile is **not** a guest account |
| Rebalancing | Not guest **and** viewer is **the profile owner** |

## emits_to_parent

Child summary components dispatch Redux actions; this root **renders** the resulting modals (no DOM events bubble):

- `open_transfer_modal` (concept) — via `WalletAction` → see [wallet-actions.md](wallet-actions.md)
- `open_power_modal`, `open_swap_modal`, `open_delegate_modal`, etc. — see [../modals/global-wallet-modals.md](../modals/global-wallet-modals.md)

## integration_contract

```yaml
integration_contract:
  input_data:
    - route_name_param
    - query_type
    - redux_wallet_modal_flags
  emitted_actions:
    - set_wallet_type_store
  controlled_by_page_state:
    - url_search_params
    - guest_vs_owner_visibility
```

## Partial loading

Token lists and chain data may load in background; **tab shell** stays visible; inner wallet components show their own spinners.

## References

- [../page-spec.md](../page-spec.md) — parent shell and routing
- [waiv-wallet.md](waiv-wallet.md) — WAIV pane
- [hive-wallet.md](hive-wallet.md) — HIVE pane
- [wallet-actions.md](wallet-actions.md) — actions used inside panes
- [../modals/global-wallet-modals.md](../modals/global-wallet-modals.md) — modals mounted here
