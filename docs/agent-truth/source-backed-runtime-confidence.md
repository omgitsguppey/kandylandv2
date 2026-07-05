# Source-Backed Runtime Confidence

Generated: 2026-07-05T01:11:35.461Z

Latest code version: eab156ec8670f1e777d277b1c18485031290f2dd

## Summary

- Status: `source_ready_runtime_confidence`
- Runtime confidence score: 100
- Runtime contracts present: true
- Deployed smoke present: false
- Launch gate impact: `does_not_clear_runtime_smoke`
- Deployed route evidence still required: true

## Source-Ready Runtime Lanes

- Watch time runtime source ready: true
- Telemetry pipeline source ready: true
- Wallet loading source ready: true
- Creator drop status runtime source ready: true
- Global user dedupe source ready: true
- Operator revenue smoke source signal: true

## Validators

| Command | Status | Artifact | Detail |
| --- | --- | --- | --- |
| npm run check:runtime-watch-time-v2 | pass | agent/state/runtime-watch-time-v2.generated.json | agent/state/runtime-watch-time-v2.generated.json is older than HEAD but no owned source inputs changed. |
| npm run check:final-telemetry-closure-lock | pass | agent/state/final-telemetry-closure-lock.generated.json | agent/state/final-telemetry-closure-lock.generated.json was generated for the current code version. |
| npm run check:telemetry-admin-debug-truth | pass | agent/state/telemetry-admin-debug-truth.generated.json | agent/state/telemetry-admin-debug-truth.generated.json was generated for the current code version. |
| npm run check:mobile-loading-hydration-stability | pass | agent/state/mobile-loading-hydration-stability.generated.json | agent/state/mobile-loading-hydration-stability.generated.json is older than HEAD but no owned source inputs changed. |
| npm run check:user-loading-wallet-mobile-refinement | pass | agent/state/user-loading-wallet-mobile-refinement.generated.json | agent/state/user-loading-wallet-mobile-refinement.generated.json is older than HEAD but no owned source inputs changed. |
| npm run check:creator-drop-status-metrics | pass | agent/state/creator-drop-status-metrics.generated.json | agent/state/creator-drop-status-metrics.generated.json is older than HEAD but no owned source inputs changed. |
| npm run check:global-user-dedupe-normalization | pass | agent/state/global-user-dedupe-normalization.generated.json | agent/state/global-user-dedupe-normalization.generated.json is older than HEAD but no owned source inputs changed. |
| npm run check:operator-revenue-smoke | pass | agent/state/operator-revenue-smoke.generated.json | agent/state/operator-revenue-smoke.generated.json is older than HEAD but no owned source inputs changed. |

## Evidence Boundary

This is source-backed runtime confidence only. It is not deployed route evidence, provider-backed site activity, or admin source activity sample evidence. It does not clear: `runtime_smoke`, `provider_smoke`, `admin_truth_sample`.
