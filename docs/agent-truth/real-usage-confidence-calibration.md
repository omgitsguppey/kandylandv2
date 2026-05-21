# Real Usage Confidence Calibration

Status: source-only calibration for non-UI beta confidence. It does not read production data, mutate legacy records, call providers, or clear formal gates.

## Summary

- Status: source_ready_real_usage_confidence_calibrated
- Calibrated confidence score: 63.27
- Runtime health credit: 92
- Evidence completeness credit: 63.27
- Operator-confirmed $50 sale recognized: true
- Formal provider gate cleared: false
- Deployed runtime gate cleared: false
- Manual visual gate cleared: false

## Behavior Math Connection

- Per-user confidence: exact
- Linked guest/user no double count: true
- Disabled tracking suppressed: true
- Unknown legacy excluded: true
- March 1 recovery dry-run: true
- Watch time source: watch_session_rollups_only

## Per-Flow Confidence

- wallet_refill: observed_operator_confirmed; score=84; observedCount=1; source=agent/state/operator-revenue-smoke.generated.json; next=Keep the operator-confirmed revenue signal separate from formal provider smoke.
- gumdrop_credit: observed_telemetry_source_ready; score=76; observedCount=0; source=src/lib/analytics/materialization-contract.ts; next=Keep ledger/materializer source readiness as confidence only.
- user_dashboard: observed_telemetry_source_ready; score=72; observedCount=0; source=src/lib/analytics/telemetry-dependency-graph.ts; next=Use source-backed dashboard telemetry as non-visual confidence.
- creator_dashboard: observed_telemetry_source_ready; score=72; observedCount=0; source=agent/state/creator-drop-status-metrics.generated.json; next=Use creator dashboard source readiness as non-visual confidence.
- creator_settings: inferred_from_validated_path; score=58; observedCount=0; source=src/lib/analytics/telemetry-dependency-graph.ts; next=Attach operator or telemetry evidence before treating creator settings as observed.
- creator_drop_manager: observed_telemetry_source_ready; score=76; observedCount=0; source=agent/state/creator-drop-status-metrics.generated.json; next=Keep creator drop manager confidence tied to source telemetry and admin status metrics.
- creator_profile_timeline: unknown_legacy; score=0; observedCount=0; source=src/lib/behavioral/behavior-math-engine.ts; next=Recover March 1 legacy profile/timeline records through dry-run mapping before counting them.
- broadcast_source: inferred_from_validated_path; score=55; observedCount=0; source=src/lib/analytics/telemetry-dependency-graph.ts; next=Keep broadcast as source-ready until a concrete observed event is confirmed.
- fan_pass_source: inferred_from_validated_path; score=55; observedCount=0; source=src/lib/analytics/telemetry-dependency-graph.ts; next=Keep Fan Pass source readiness separate from subscription/payment runtime proof.
- drops_unlock_open: observed_telemetry_source_ready; score=70; observedCount=0; source=src/lib/behavioral/behavior-math-engine.ts; next=Use behavior math confidence for non-payment drop-open evidence only.
- runtime_watch_source: observed_telemetry_source_ready; score=78; observedCount=0; source=src/lib/behavioral/behavior-math-engine.ts; next=Keep watch confidence tied to watch-session rollups, not page-open time.

## Limits

- does_not_clear_formal_provider
- does_not_clear_deployed_runtime
- does_not_clear_manual_visual

## Next Action

Use calibrated real usage confidence for non-UI source/runtime scoring only; keep formal provider, deployed runtime, and visual gates separate.
