# Analytics Cost Hot Path Reduction

Generated: 2026-05-19T13:15:00.000Z

This pass reduces the highest-ROI analytics/cloud cost hot paths without changing priority event capture or promoting external evidence to product truth.

## Fixed

- BigQuery raw-event export now checks the daily cadence window before starting the claim transaction.
- BigQuery export uses a bounded watermark batch helper instead of exporting only the triggering event row.
- Anonymous analytics ingest no longer awaits user tracking index materialization in the request path.
- Invalid JSON and invalid/empty anonymous analytics payloads return calm non-retryable 4xx responses.
- Admin realtime summary cadence moved from every 1 minute to every 5 minutes.
- Admin historical analytics defaults to the 24h non-priority evidence cache and labels cache age/source freshness.
- Admin Debug has a short private hot-cache guard and bounded queue heartbeat reads.
- Queue heartbeat listing reads the latest bounded sample instead of the full heartbeat collection.

## Deferred

- Admin Debug full domain lazy splitting is deferred because the existing route feeds a broad client payload. The exact next split is creator operations, orchestration evidence, analytics truth drilldowns, and package/dependency evidence.
- Identified analytics ingest still needs a separate known-user freshness review before moving its materializer call.
- Scheduled BigQuery export source helper exists in the export module, but Functions index promotion is deferred to a deployment-scoped pass.

## Savings Model

Savings are modeled as percentages only. No dollar savings are claimed without billing export evidence.

- BigQuery export claim transactions: up to 99% fewer claim transactions when many events land inside the daily window.
- BigQuery export rows: 95-99% fewer function starts per exported batch after scheduled export promotion.
- Anonymous ingest: 20-60% lower hot-route CPU/read/write work by deferring user index materialization.
- Malformed analytics retries: 50-90% fewer retry-loop requests.
- Realtime summary scheduler: 80% fewer scheduled invocations.
- Admin historical: up to 99.9% fewer cold rebuilds for repeated unchanged reads.
- Queue heartbeats: 80-99% fewer heartbeat reads as history grows.
