# Score Impact Stale Artifact Sweep

Generated: 2026-06-20T16:47:30.332Z
Score: 70.79 -> 76.88 (+6.09)
Formal evidence gates unchanged: yes

## Summary

- Requested lanes: 17
- Refreshed current: 0
- Blocked refreshes: 1
- Remaining score-impact stale artifacts: 0
- Dirty files classified: yes
- Open PRs classified: yes

## Artifact Actions

| Artifact | Status | Command | Next action |
| --- | --- | --- | --- |
| agent/state/current-beta-exit-status.generated.json | refreshed_older_code_version | npm run check:current-beta-exit-status | Rerun npm run check:current-beta-exit-status after fixing source version metadata. |
| agent/state/overnight-final-integration-lock.generated.json | blocked_failed_refresh | npm run check:overnight-final-integration-lock | Fix the validator blocker and rerun npm run check:overnight-final-integration-lock. |
| agent/state/evidence-capture-status.generated.json | refreshed_older_code_version | npm run check:evidence-capture-status | Rerun npm run check:evidence-capture-status after fixing source version metadata. |
| agent/state/beta-evidence-gap-map.generated.json | refreshed_older_code_version | npm run check:beta-evidence-gap-map | Rerun npm run check:beta-evidence-gap-map after fixing source version metadata. |
| agent/state/beta-evidence-lane-prep.generated.json | refreshed_older_code_version | npm run check:beta-evidence-lane-prep | Rerun npm run check:beta-evidence-lane-prep after fixing source version metadata. |
| agent/state/beta-freshness-language.generated.json | refreshed_older_code_version | npm run check:beta-freshness-language | Rerun npm run check:beta-freshness-language after fixing source version metadata. |
| agent/state/final-pr-stale-cleanup.generated.json | refreshed_older_code_version | npm run check:final-pr-stale-cleanup | Rerun npm run check:final-pr-stale-cleanup after fixing source version metadata. |
| agent/state/source-truth-authority-map.generated.json | refreshed_older_code_version | npm run check:source-truth-authority-map | Rerun npm run check:source-truth-authority-map after fixing source version metadata. |
| agent/state/final-telemetry-closure-lock.generated.json | refreshed_older_code_version | npm run check:final-telemetry-closure-lock | Rerun npm run check:final-telemetry-closure-lock after fixing source version metadata. |
| agent/state/mobile-ui-final-lock.generated.json | refreshed_older_code_version | npm run check:mobile-ui-final-lock | Rerun npm run check:mobile-ui-final-lock after fixing source version metadata. |
| agent/state/creator-settings-control-plane.generated.json | refreshed_older_code_version | npm run check:creator-settings-control-plane | Rerun npm run check:creator-settings-control-plane after fixing source version metadata. |
| agent/state/creator-drop-status-metrics.generated.json | refreshed_older_code_version | npm run check:creator-drop-status-metrics | Rerun npm run check:creator-drop-status-metrics after fixing source version metadata. |
| agent/state/operator-revenue-smoke.generated.json | refreshed_older_code_version | npm run check:operator-revenue-smoke | Rerun npm run check:operator-revenue-smoke after fixing source version metadata. |
| agent/state/overnight-wiring-integrity.generated.json | refreshed_older_code_version | npm run check:overnight-wiring-integrity | Rerun npm run check:overnight-wiring-integrity after fixing source version metadata. |
| agent/state/existing-algorithm-refinement.generated.json | refreshed_older_code_version | npm run check:existing-algorithm-refinement | Rerun npm run check:existing-algorithm-refinement after fixing source version metadata. |
| agent/state/user-loading-wallet-mobile-refinement.generated.json | refreshed_older_code_version | npm run check:user-loading-wallet-mobile-refinement | Rerun npm run check:user-loading-wallet-mobile-refinement after fixing source version metadata. |
| agent/state/global-marquee-truncated-titles.generated.json | refreshed_older_code_version | npm run check:global-marquee-truncated-titles | Rerun npm run check:global-marquee-truncated-titles after fixing source version metadata. |

## Remaining Formal Evidence Gates

- UI surface coverage is source-owned; browser or screenshot review is optional reproduction only after a source-reported UI issue.
- Runtime/provider smoke remains formal deployed/provider evidence, not source refresh.
- Admin truth/sample evidence remains formal evidence unless a formal sample is attached.

## Next Exact Steps

1. Fix the overnight-final-integration-lock creator drop metrics status blocker before treating that lock as passed.
2. Run deterministic UI source coverage before optional browser reproduction; attach deployed runtime/provider and admin truth sample evidence before beta exit review.
3. Keep npm run check:refresh-safeguards and npm run score:beta together when score-impact reports change.

