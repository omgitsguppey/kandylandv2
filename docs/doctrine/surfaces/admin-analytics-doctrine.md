# Admin Analytics Doctrine

Authority: admin reporting truth for analytics panels, cards, tables, and compact diagnostic charts.

## Rules

- Admin Analytics is reporting truth. It must expose scope, range, `generatedAtUtc`, `sourceTruth`, `freshnessState`, and numerator/denominator truth before showing rates.
- WAIT means actively loading only.
- `WAIT` means actively loading only. Loaded, missing, unavailable, stale, estimated, no-sample, not-observed, and verified-zero values must use explicit non-WAIT states.
- A zero is valid only when the source loaded and verified zero.
- zero requires verified source proof before rendering a numeric zero.
- Zero requires a verified source. Missing samples render `not_observed`, `no_sample`, `unavailable`, or `unknown`.
- estimated is not verified. Estimated, recovered, fallback, and bridge values are not verified. If final reporting includes them, the quality state is mixed/estimated/review.
- No rate may render without denominator, source, and range truth.
- No conversion/rate may be calculated across mismatched source, range, unit, package, actor, or denominator unless a documented bridge source is shown.
- Display language uses unwrap/unwrapped/unwraps. Backend entitlement fields may still use unlock internally.
- Raw UIDs and raw drop IDs are secondary/collapsed details when readable names exist.
- Admin/internal/operator/test/system activity must be separated from external demand.
- Panels with more rows than visible must expose page, pageSize, hasNext, totalRows when known, and sourceMode for top-N snapshots.

## Canonical Helpers

- `resolveMetricState`
- `safeRate`
- `getRollingWindow`
- `resolveWatchTruth`
- `classifyEventContext`
- `adjustRegionalDemand`
- `resolvePanelPagination`

These live in `src/lib/deterministic-admin-truth.ts`.
