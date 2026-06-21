# Global User Dedupe Normalization

Generated: 2026-06-21T22:49:09.756Z
Status: pass
Current head: 82f39c11773781349bf5873d9fc870b681a53d87

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
| sourceHealth | 98.6 | 98.6 | target_met | No global/user dedupe score action needed for this dimension. |
| runtimeHealth | 85.34 | 85.34 | target_met | No global/user dedupe score action needed for this dimension. |
| evidenceCompleteness | 95.2 | 95.2 | target_met | No global/user dedupe score action needed for this dimension. |
| freshness | 91.88 | 91.88 | target_met | No global/user dedupe score action needed for this dimension. |
| costRisk | 42 | 42 | below_target | Resolve formal beta score gates outside analytics dedupe; do not fake runtime/provider evidence. |
| regressionRisk | 94 | 94 | target_met | No global/user dedupe score action needed for this dimension. |
| overallHealthScore | 88.68 | 88.68 | target_met | No global/user dedupe score action needed for this dimension. |

## Dirty Files

- agent/state/global-user-dedupe-normalization.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- agent/state/source-backed-runtime-confidence.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/global-user-dedupe-normalization.md: release_artifact_expected
- docs/agent-truth/source-backed-runtime-confidence.md: documentation_artifact_expected
- scripts/agent/validate-global-user-dedupe-normalization.ts: validator_artifact_expected
- scripts/agent/validate-source-backed-runtime-confidence.ts: validator_artifact_expected
- tests/unit/source-backed-runtime-confidence.spec.ts: test_artifact_expected

## Validation Failures

- none
