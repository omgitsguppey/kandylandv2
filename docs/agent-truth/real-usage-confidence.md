# Real Usage Confidence

Status: source-only confidence engine. It does not read production data, call providers, mutate runtime paths, or clear typed beta evidence gates.

## Summary

- Overall status: source_ready_real_usage_confidence
- Passed: true
- Confidence score: 72/100
- Observed site activity signals: 0
- Source-ready signals: 8
- Ignored unknown usage records: 0

## Limits

- does_not_clear_formal_provider
- does_not_clear_deployed_runtime

## Signals

- purchase_flow_seen: source_ready; contribution=10; source=agent/state/operator-revenue-smoke.generated.json; next=Use source-ready purchase telemetry as bounded confidence only; keep operator context separate from observed site activity evidence.
- gumdrop_credit_flow_seen: source_ready; contribution=10; source=src/lib/analytics/materialization-contract.ts; next=Use source-ready status as confidence only until observed site activity evidence is available.
- user_dashboard_seen: source_ready; contribution=8; source=src/lib/analytics/telemetry-dependency-graph.ts; next=Use source-ready status as confidence only until observed site activity evidence is available.
- creator_dashboard_seen: source_ready; contribution=8; source=agent/state/creator-drop-status-metrics.generated.json; next=Use source-ready status as confidence only until observed site activity evidence is available.
- creator_drop_manager_seen: source_ready; contribution=10; source=agent/state/creator-drop-status-metrics.generated.json; next=Use source-ready status as confidence only until observed site activity evidence is available.
- fan_pass_flow_seen: source_ready; contribution=8; source=src/lib/analytics/telemetry-dependency-graph.ts; next=Use source-ready status as confidence only until observed site activity evidence is available.
- broadcast_flow_source_ready: source_ready; contribution=8; source=src/lib/analytics/telemetry-dependency-graph.ts; next=Use source-ready status as confidence only until observed site activity evidence is available.
- wallet_flow_source_ready: source_ready; contribution=10; source=agent/state/source-backed-runtime-confidence.generated.json; next=Use source-ready status as confidence only until observed site activity evidence is available.

## Next Action

Use source-derived real usage confidence only; keep operator context, provider-backed site activity evidence, and deployed route evidence separate.
