# Monolith + Orphan Metric Registry

Status: source-only debug registry. No production reads, live backfills, payment runtime changes, chat changes, or nav changes were performed.

## Summary

- Overall status: fail
- Overall score: 80/100
- Metrics tracked: 14
- Fully linked metrics: 12
- Source-ready/evidence-gap metrics: 1
- Archived/supporting evidence metrics: 1
- Monoliths tracked: 5
- High-risk monoliths: 5

## Unresolved Metric Actions

- runtime_watch_time: source_ready_evidence_gap. Keep runtime watch-time degraded until persisted watch-session evidence proves the metric in admin/debug output.
- external_ga4_evidence: archived. Keep external evidence archive-only unless an explicit guarded refresh artifact is produced.

## High-Risk Monolith Actions

- src/app/api/admin/debug/route.ts: owner=admin-debug. Extract named drilldown loaders for the highest-churn debug sections before adding more evidence lanes.
- src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx: owner=admin-analytics. Split state by tab the next time a metric source or consumer changes in admin analytics.
- src/app/api/admin/analytics/historical/route.ts: owner=admin-analytics. When touching historical analytics, extract one cohesive validation helper instead of adding route-local branches.
- functions/src/behavioral-intelligence-runtime.ts: owner=behavioral-intelligence. Add split plan before new behavior metrics are added to the runtime materializer.
- scripts/agent/validate-admin-debug-control-tower.ts: owner=debug-validation. Split one report-specific assertion cluster when the validator is next edited.

## Validator

- `npm run check:monolith-orphan-metric-registry`
