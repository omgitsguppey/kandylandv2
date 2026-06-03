# Source-Backed Runtime Confidence

Generated: 2026-06-03T04:40:31.005Z

Latest code version: 225f9e53f18b60edc7399c1ea258c0b9bacfae84

## Summary

- Status: `source_ready_runtime_confidence`
- Runtime confidence score: 100
- Runtime contracts present: true
- Deployed smoke present: false
- Launch gate impact: `does_not_clear_runtime_smoke`
- Formal runtime smoke still required: true

## Source-Ready Runtime Lanes

- Watch time runtime source ready: true
- Telemetry pipeline source ready: true
- Wallet loading source ready: true
- Creator drop status runtime source ready: true
- Operator revenue smoke source signal: true

## Validators

| Command | Status | Artifact | Detail |
| --- | --- | --- | --- |
| npm run check:runtime-watch-time-v2 | pass | agent/state/runtime-watch-time-v2.generated.json | Artifact is current for the latest code version. |
| npm run check:final-telemetry-closure-lock | pass | agent/state/final-telemetry-closure-lock.generated.json | Artifact is current for the latest code version. |
| npm run check:telemetry-admin-debug-truth | pass | agent/state/telemetry-admin-debug-truth.generated.json | Artifact is current for the latest code version. |
| npm run check:mobile-loading-hydration-stability | pass | agent/state/mobile-loading-hydration-stability.generated.json | Artifact is current for the latest code version. |
| npm run check:user-loading-wallet-mobile-refinement | pass | agent/state/user-loading-wallet-mobile-refinement.generated.json | Artifact is current for the latest code version. |
| npm run check:creator-drop-status-metrics | pass | agent/state/creator-drop-status-metrics.generated.json | Artifact is current for the latest code version. |
| npm run check:operator-revenue-smoke | pass | agent/state/operator-revenue-smoke.generated.json | Artifact is current for the latest code version. |

## Evidence Boundary

This is source-backed runtime confidence only. It is not deployed runtime smoke, provider smoke, manual screenshot evidence, or admin truth sample evidence. It does not clear: `runtime_smoke`, `provider_smoke`, `manual_screenshot`, `admin_truth_sample`.
