# Real Usage Confidence

Status: source-only confidence engine. It does not read production data, call providers, mutate runtime paths, or clear formal beta gates.

## Summary

- Overall status: source_ready_real_usage_confidence
- Passed: true
- Confidence score: 72/100
- Observed proof signals: 0
- Source-ready signals: 8
- Ignored unknown usage records: 0

## Limits

- does_not_clear_formal_provider
- does_not_clear_deployed_runtime

## Signals

- purchase_flow_seen: source_ready; contribution=10; source=agent/state/operator-revenue-smoke.generated.json; next=Use source-ready purchase telemetry as bounded confidence only; keep operator context separate from observed proof.
- gumdrop_credit_flow_seen: source_ready; contribution=10; source=src/lib/analytics/materialization-contract.ts; next=Use source-ready status as confidence only until real observed usage is operator-confirmed or formally evidenced.
- user_dashboard_seen: source_ready; contribution=8; source=src/lib/analytics/telemetry-dependency-graph.ts; next=Use source-ready status as confidence only until real observed usage is operator-confirmed or formally evidenced.
- creator_dashboard_seen: source_ready; contribution=8; source=agent/state/creator-drop-status-metrics.generated.json; next=Use source-ready status as confidence only until real observed usage is operator-confirmed or formally evidenced.
- creator_drop_manager_seen: source_ready; contribution=10; source=agent/state/creator-drop-status-metrics.generated.json; next=Use source-ready status as confidence only until real observed usage is operator-confirmed or formally evidenced.
- fan_pass_flow_seen: source_ready; contribution=8; source=src/lib/analytics/telemetry-dependency-graph.ts; next=Use source-ready status as confidence only until real observed usage is operator-confirmed or formally evidenced.
- broadcast_flow_source_ready: source_ready; contribution=8; source=src/lib/analytics/telemetry-dependency-graph.ts; next=Use source-ready status as confidence only until real observed usage is operator-confirmed or formally evidenced.
- wallet_flow_source_ready: source_ready; contribution=10; source=agent/state/source-backed-runtime-confidence.generated.json; next=Use source-ready status as confidence only until real observed usage is operator-confirmed or formally evidenced.

## Next Action

Use source-derived real usage confidence only; keep operator context, formal provider, and deployed runtime gates separate.
