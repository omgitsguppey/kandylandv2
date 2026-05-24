# Global User Dedupe Normalization

Generated: 2026-05-24T09:44:02.196Z
Status: pass
Current head: 991e1848a9adf87ce6a97f95eb7e5f8bcfbfb49f

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
| sourceHealth | 92.5 | 92.5 | target_met | No global/user dedupe score action needed for this dimension. |
| runtimeHealth | 84.2 | 84.2 | target_met | No global/user dedupe score action needed for this dimension. |
| evidenceCompleteness | 69.6 | 72 | below_target | Resolve formal beta score gates outside analytics dedupe; do not fake runtime/provider evidence. |
| freshness | 83.75 | 83.75 | target_met | No global/user dedupe score action needed for this dimension. |
| costRisk | 42 | 42 | below_target | Resolve formal beta score gates outside analytics dedupe; do not fake runtime/provider evidence. |
| regressionRisk | 86 | 86 | target_met | No global/user dedupe score action needed for this dimension. |
| overallHealthScore | 79.25 | 79.25 | below_target | Resolve formal beta score gates outside analytics dedupe; do not fake runtime/provider evidence. |

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/state/activity-verification-engine.generated.json: current_generated_artifact_to_commit
- agent/state/event-envelope-normalization.generated.json: current_generated_artifact_to_commit
- agent/state/event-translation-bridge.generated.json: current_generated_artifact_to_commit
- agent/state/global-user-dedupe-normalization.generated.json: current_generated_artifact_to_commit
- agent/state/person-metrics-hydration.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/event-envelope-normalization.md: documentation_artifact_expected
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/global-user-dedupe-normalization.md: release_artifact_expected
- docs/agent-truth/person-metrics-hydration.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-global-user-dedupe-normalization.ts: validator_artifact_expected
- src/lib/analytics-action-taxonomy.ts: real_source_change_needs_review
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/analytics/global-user-dedupe-contract.ts: real_source_change_needs_review
- src/lib/analytics/global-user-dedupe-engine.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/behavioral/event-fact-contract.ts: real_source_change_needs_review
- src/lib/behavioral/normalize-event-fact.ts: real_source_change_needs_review
- src/lib/debug/debug-panel-tracking-summary.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/global-user-dedupe-normalization.spec.ts: test_artifact_expected

## Validation Failures

- none
