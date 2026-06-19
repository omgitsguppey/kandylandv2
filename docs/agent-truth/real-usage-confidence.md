# Real Usage Confidence

Status: source-only confidence engine. It does not read production data, call providers, mutate runtime paths, or clear formal beta gates.

## Summary

- Overall status: source_ready_real_usage_confidence
- Passed: true
- Confidence score: 92/100
- Observed operator-confirmed signals: 1
- Source-ready signals: 7
- Ignored unknown usage records: 0

## Limits

- does_not_clear_formal_provider
- does_not_clear_deployed_runtime

## Signals

- purchase_flow_seen: observed; contribution=30; source=agent/state/operator-revenue-smoke.generated.json; next=Use this as bounded confidence only; attach formal provider/runtime evidence separately.
- gumdrop_credit_flow_seen: source_ready; contribution=10; source=src/lib/analytics/materialization-contract.ts; next=Use source-ready status as confidence only until real observed usage is operator-confirmed or formally evidenced.
- user_dashboard_seen: source_ready; contribution=8; source=src/lib/analytics/telemetry-dependency-graph.ts; next=Use source-ready status as confidence only until real observed usage is operator-confirmed or formally evidenced.
- creator_dashboard_seen: source_ready; contribution=8; source=agent/state/creator-drop-status-metrics.generated.json; next=Use source-ready status as confidence only until real observed usage is operator-confirmed or formally evidenced.
- creator_drop_manager_seen: source_ready; contribution=10; source=agent/state/creator-drop-status-metrics.generated.json; next=Use source-ready status as confidence only until real observed usage is operator-confirmed or formally evidenced.
- fan_pass_flow_seen: source_ready; contribution=8; source=src/lib/analytics/telemetry-dependency-graph.ts; next=Use source-ready status as confidence only until real observed usage is operator-confirmed or formally evidenced.
- broadcast_flow_source_ready: source_ready; contribution=8; source=src/lib/analytics/telemetry-dependency-graph.ts; next=Use source-ready status as confidence only until real observed usage is operator-confirmed or formally evidenced.
- wallet_flow_source_ready: source_ready; contribution=10; source=agent/state/source-backed-runtime-confidence.generated.json; next=Use source-ready status as confidence only until real observed usage is operator-confirmed or formally evidenced.

## Next Action

Use real usage confidence as source/runtime confidence only; keep formal provider and deployed runtime gates separate.
