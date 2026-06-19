# Source-Backed Runtime Confidence

Generated: 2026-06-19T14:33:44.216Z

Latest code version: fbc3a07e813b938bea6c96792ccb9e54d8596734

## Summary

- Status: `failed`
- Runtime confidence score: 0
- Runtime contracts present: false
- Deployed smoke present: false
- Launch gate impact: `does_not_clear_runtime_smoke`
- Formal runtime smoke still required: true

## Source-Ready Runtime Lanes

- Watch time runtime source ready: false
- Telemetry pipeline source ready: false
- Wallet loading source ready: false
- Creator drop status runtime source ready: false
- Operator revenue smoke source signal: false

## Validators

| Command | Status | Artifact | Detail |
| --- | --- | --- | --- |
| npm run check:runtime-watch-time-v2 | fail | agent/state/runtime-watch-time-v2.generated.json | Artifact was not generated from the latest code version. |
| npm run check:final-telemetry-closure-lock | fail | agent/state/final-telemetry-closure-lock.generated.json | Artifact was not generated from the latest code version. |
| npm run check:telemetry-admin-debug-truth | fail | agent/state/telemetry-admin-debug-truth.generated.json | Artifact was not generated from the latest code version. |
| npm run check:mobile-loading-hydration-stability | fail | agent/state/mobile-loading-hydration-stability.generated.json | Artifact was not generated from the latest code version. |
| npm run check:user-loading-wallet-mobile-refinement | fail | agent/state/user-loading-wallet-mobile-refinement.generated.json | Artifact was not generated from the latest code version. |
| npm run check:creator-drop-status-metrics | fail | agent/state/creator-drop-status-metrics.generated.json | Artifact was not generated from the latest code version. |
| npm run check:operator-revenue-smoke | fail | agent/state/operator-revenue-smoke.generated.json | Artifact was not generated from the latest code version. |

## Evidence Boundary

This is source-backed runtime confidence only. It is not deployed runtime smoke, provider smoke, or admin truth sample evidence. It does not clear: `runtime_smoke`, `provider_smoke`, `admin_truth_sample`.
