# Source-Backed Runtime Confidence

Generated: 2026-06-21T05:03:53.541Z

Latest code version: d6a36e912023ea4d8ff659f1aee813e078043d2b

## Summary

- Status: `partial_source_runtime_confidence`
- Runtime confidence score: 45
- Runtime contracts present: false
- Deployed smoke present: false
- Launch gate impact: `does_not_clear_runtime_smoke`
- Deployed route evidence still required: true

## Source-Ready Runtime Lanes

- Watch time runtime source ready: true
- Telemetry pipeline source ready: false
- Wallet loading source ready: false
- Creator drop status runtime source ready: true
- Operator revenue smoke source signal: true

## Validators

| Command | Status | Artifact | Detail |
| --- | --- | --- | --- |
| npm run check:runtime-watch-time-v2 | pass | agent/state/runtime-watch-time-v2.generated.json | agent/state/runtime-watch-time-v2.generated.json is older than HEAD but no owned source inputs changed. |
| npm run check:final-telemetry-closure-lock | fail | agent/state/final-telemetry-closure-lock.generated.json | agent/state/final-telemetry-closure-lock.generated.json was generated from an older code version. |
| npm run check:telemetry-admin-debug-truth | fail | agent/state/telemetry-admin-debug-truth.generated.json | agent/state/telemetry-admin-debug-truth.generated.json was generated from an older code version. |
| npm run check:mobile-loading-hydration-stability | fail | agent/state/mobile-loading-hydration-stability.generated.json | agent/state/mobile-loading-hydration-stability.generated.json was generated from an older code version. |
| npm run check:user-loading-wallet-mobile-refinement | fail | agent/state/user-loading-wallet-mobile-refinement.generated.json | agent/state/user-loading-wallet-mobile-refinement.generated.json was generated from an older code version. |
| npm run check:creator-drop-status-metrics | pass | agent/state/creator-drop-status-metrics.generated.json | agent/state/creator-drop-status-metrics.generated.json is older than HEAD but no owned source inputs changed. |
| npm run check:operator-revenue-smoke | pass | agent/state/operator-revenue-smoke.generated.json | agent/state/operator-revenue-smoke.generated.json is older than HEAD but no owned source inputs changed. |

## Evidence Boundary

This is source-backed runtime confidence only. It is not deployed route evidence, provider-backed site activity, or admin source activity sample evidence. It does not clear: `runtime_smoke`, `provider_smoke`, `admin_truth_sample`.
