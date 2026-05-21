# Score Impact Stale Artifact Sweep

Generated: 2026-05-21T01:45:44.698Z
Score: 59.6 -> 59.74 (+0.14)
Formal evidence gates unchanged: yes

## Summary

- Requested lanes: 17
- Refreshed current: 16
- Blocked refreshes: 1
- Remaining score-impact stale artifacts: 0
- Dirty files classified: yes
- Open PRs classified: yes

## Artifact Actions

| Artifact | Status | Command | Next action |
| --- | --- | --- | --- |
| agent/state/current-beta-exit-status.generated.json | refreshed_current | npm run check:current-beta-exit-status | No action needed for this sweep. |
| agent/state/overnight-final-integration-lock.generated.json | blocked_failed_refresh | npm run check:overnight-final-integration-lock | Fix the validator blocker and rerun npm run check:overnight-final-integration-lock. |
| agent/state/evidence-capture-status.generated.json | refreshed_current | npm run check:evidence-capture-status | No action needed for this sweep. |
| agent/state/beta-evidence-gap-map.generated.json | refreshed_current | npm run check:beta-evidence-gap-map | No action needed for this sweep. |
| agent/state/beta-evidence-lane-prep.generated.json | refreshed_current | npm run check:beta-evidence-lane-prep | No action needed for this sweep. |
| agent/state/beta-freshness-language.generated.json | refreshed_current | npm run check:beta-freshness-language | No action needed for this sweep. |
| agent/state/final-pr-stale-cleanup.generated.json | refreshed_current | npm run check:final-pr-stale-cleanup | No action needed for this sweep. |
| agent/state/source-truth-authority-map.generated.json | refreshed_current | npm run check:source-truth-authority-map | No action needed for this sweep. |
| agent/state/final-telemetry-closure-lock.generated.json | refreshed_current | npm run check:final-telemetry-closure-lock | No action needed for this sweep. |
| agent/state/mobile-ui-final-lock.generated.json | refreshed_current | npm run check:mobile-ui-final-lock | No action needed for this sweep. |
| agent/state/creator-settings-control-plane.generated.json | refreshed_current | npm run check:creator-settings-control-plane | No action needed for this sweep. |
| agent/state/creator-drop-status-metrics.generated.json | refreshed_current | npm run check:creator-drop-status-metrics | No action needed for this sweep. |
| agent/state/operator-revenue-smoke.generated.json | refreshed_current | npm run check:operator-revenue-smoke | No action needed for this sweep. |
| agent/state/overnight-wiring-integrity.generated.json | refreshed_current | npm run check:overnight-wiring-integrity | No action needed for this sweep. |
| agent/state/existing-algorithm-refinement.generated.json | refreshed_current | npm run check:existing-algorithm-refinement | No action needed for this sweep. |
| agent/state/user-loading-wallet-mobile-refinement.generated.json | refreshed_current | npm run check:user-loading-wallet-mobile-refinement | No action needed for this sweep. |
| agent/state/global-marquee-truncated-titles.generated.json | refreshed_current | npm run check:global-marquee-truncated-titles | No action needed for this sweep. |

## Remaining Formal Evidence Gates

- Visual/manual smoke remains formal evidence, not source refresh.
- Runtime/provider smoke remains formal deployed/provider evidence, not source refresh.
- Admin truth/sample evidence remains formal evidence unless a formal sample is attached.

## Next Exact Steps

1. Fix the overnight-final-integration-lock creator drop metrics status blocker before treating that lock as passed.
2. Attach formal visual/manual, deployed runtime/provider, and admin truth sample evidence before beta exit review.
3. Keep npm run check:refresh-safeguards and npm run score:beta together when score-impact reports change.

