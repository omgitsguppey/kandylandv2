# Backend Cost Consolidation

Generated: 2026-05-27T03:56:30.144Z
Current head: 360b1047

## Policy

- Admin/debug default mode: summary_first
- Raw drilldown policy: explicit_paged_drilldown_only
- Non-critical analytics refresh: 24h
- Realtime policy: user_critical_only
- Diagnostics policy: fingerprinted_hourly

## Cost Risks Reduced

- Admin/debug default summary only
- Raw drilldowns paged and explicit
- Non-critical analytics refresh 24h
- Realtime only for user-critical features
- Diagnostics fingerprinted/hourly
- No per-event BigQuery export from runtime routes
- No casual Cloud SQL/Data Connect mirror sync
- No paid AI/Gemini/Cloud Assist calls from runtime paths
- Firestore reads classified as bounded, review, or drilldown
- Broad Promise.all fanout classified for service consolidation

## Top Cost Risks

- FUNCTION functions:orchestration-diagnostics: review_read_bound; owner=debug/control tower service
