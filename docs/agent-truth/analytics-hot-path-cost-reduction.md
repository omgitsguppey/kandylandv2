# Analytics Hot Path Cost Reduction

Generated report: `agent/state/analytics-hot-path-cost-reduction.generated.json`

This phase targets the first-cost analytics lanes without weakening priority telemetry truth. Guest ingest still records priority batches, identified event facts still persist canonical event documents, and purchase/unlock/viewer/watch rollups remain immediate. Lower-priority timeline, user materialization, export, and diagnostic work moves toward deferred or TTL-capped lanes.

## Applied Fixes

- Anonymous ingest now returns non-retryable 4xx for permanent invalid JSON, invalid payload, empty payload, and oversized body cases.
- Consent-denied anonymous analytics calls are acknowledged without a per-request server diagnostic write.
- The guest batch transaction keeps the idempotent batch create but no longer reads the guest session document on every flush.
- Behavioral timeline facts are queued as deferred non-priority work instead of being written from the hot ingest request path.
- Identified event fact writes use deterministic Firestore create conflicts for dedupe instead of read-before-write checks.
- Event fact trigger dedupe uses create conflict semantics and queues non-priority event rollups into `analytics_event_rollup_batches`.
- BigQuery export keeps daily/window guards, watermark batching, dry-run/max-bytes/partition policy markers, readiness TTL, and now suppresses repeated failure status writes inside a TTL.

## Deferred Work

- A scheduled materializer should drain `analytics_event_rollup_batches` under the 24h non-priority cadence policy.
- The separate identified HTTP ingest route needs its own known-user freshness review before moving any materialization work.
- Removing the event-triggered BigQuery export entirely belongs in a Functions deployment/config pass. This source pass keeps the current trigger cheap for not-due windows.

## Savings Model

Savings are expressed as formulas and percentage ranges only. No dollar savings are claimed without billing evidence.

- Anonymous ingest: fewer session reads, inline timeline writes, consent diagnostics, and repeated catch-path diagnostics.
- Malformed ingest: fewer retry loops from permanent failures returning 4xx.
- Event facts: one read removed from the common create path, with duplicate protection handled by deterministic create conflicts.
- Non-priority rollups: immediate write fanout is replaced by minute-batch queue records for low-priority event names.
- BigQuery export: repeated readiness/status failures are TTL-capped and row-triggered not-due windows still exit before claim transactions.
