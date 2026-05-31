# Global User Dedupe Normalization

Generated: 2026-05-31T04:44:05.831Z
Status: pass
Current head: c2ec29f5a6c1d75ec8652e8eba92fab43e6ff718

## Contract

- Global aggregates count real unique actions once.
- User aggregates use the best available identity and suppress linked guest duplicates.
- SQL/BigQuery export keeps raw facts plus normalized summary identity instead of mutating runtime truth.
- Unknown legacy evidence is archived and cannot become exact user truth.
- Retry and replay events preserve raw export evidence but do not inflate metrics.

## Debug Lane

- Label: Global vs user dedupe
- Duplicate risk count: 3
- Linked guest/user health: healthy
- Global/user mismatch count: 0
- SQL/export parity: mapped
- Unknown legacy count: 1

## Score Impact

| Dimension | Before | After | Status | Next action |
| --- | ---: | ---: | --- | --- |
| sourceHealth | 91.7 | 91.7 | target_met | No global/user dedupe score action needed for this dimension. |
| runtimeHealth | 84.2 | 84.2 | target_met | No global/user dedupe score action needed for this dimension. |
| evidenceCompleteness | 69.6 | 72 | below_target | Resolve formal beta score gates outside analytics dedupe; do not fake runtime/provider evidence. |
| freshness | 67.5 | 82 | target_met | No global/user dedupe score action needed for this dimension. |
| costRisk | 42 | 42 | below_target | Resolve formal beta score gates outside analytics dedupe; do not fake runtime/provider evidence. |
| regressionRisk | 86 | 86 | target_met | No global/user dedupe score action needed for this dimension. |
| overallHealthScore | 76.61 | 76.61 | below_target | Resolve formal beta score gates outside analytics dedupe; do not fake runtime/provider evidence. |

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/state/analytics-panel-hydration.generated.json: current_generated_artifact_to_commit
- agent/state/current-beta-exit-status.generated.json: current_generated_artifact_to_commit
- agent/state/event-liveness-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-translation-bridge.generated.json: current_generated_artifact_to_commit
- agent/state/global-user-dedupe-normalization.generated.json: current_generated_artifact_to_commit
- agent/state/overnight-beta-readiness-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/analytics-panel-hydration.md: documentation_artifact_expected
- docs/agent-truth/current-beta-exit-status.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/event-liveness-audit.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/global-user-dedupe-normalization.md: release_artifact_expected
- docs/agent-truth/overnight-beta-readiness-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/person-metrics-hydration.md: documentation_artifact_expected
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-analytics-panel-hydration.ts: validator_artifact_expected
- scripts/agent/validate-event-liveness-audit.ts: validator_artifact_expected
- scripts/agent/validate-event-translation-bridge.ts: validator_artifact_expected
- scripts/agent/validate-global-user-dedupe-normalization.ts: validator_artifact_expected
- src/lib/admin-analytics/panel-hydration-contract.ts: real_source_change_needs_review
- src/lib/admin-analytics/panel-hydration-resolver.ts: real_source_change_needs_review
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/analytics-panel-hydration.spec.ts: test_artifact_expected

## Validation Failures

- none
