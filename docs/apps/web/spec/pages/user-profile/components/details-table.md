# DetailsTable

## metadata

| field | value |
|-------|-------|
| name | DetailsTable |
| source | `src/client/wallet/WalletTable/DetailsTable.js` |
| type | Connected |

## structure

- Passes report-scoped callbacks into `WalletTable` with `withoutFilters`.

## inputs

- `reportId` from `useParams`.

## state

- Redux advanced report details.

## actions

- `getReportDetails`, `getMoreReportDetails`, `calculateTotalChangesInDetails`.

## rendering

- Report transaction table.

## emitted events

- Pagination and selection changes.

## References

- [../routes/transfers-details/page-spec.md](../routes/transfers-details/page-spec.md)

```yaml
integration_contract:
  input_data: reportId from route.
  emitted_actions: Load and paginate report details.
  controlled_by_state: advancedReports.
  affected_by_route: transfers/details/:reportId.
  affected_by_query: none.
```
