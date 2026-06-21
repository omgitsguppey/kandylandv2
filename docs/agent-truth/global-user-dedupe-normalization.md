# Global User Dedupe Normalization

Generated: 2026-06-21T21:45:47.660Z
Status: pass
Current head: 2cb7d4c056b8ae36044f523a38222516ffc81179

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
| sourceHealth | 97.2 | 97.2 | target_met | No global/user dedupe score action needed for this dimension. |
| runtimeHealth | 91.11 | 91.11 | target_met | No global/user dedupe score action needed for this dimension. |
| evidenceCompleteness | 95.2 | 95.2 | target_met | No global/user dedupe score action needed for this dimension. |
| freshness | 91.88 | 91.88 | target_met | No global/user dedupe score action needed for this dimension. |
| costRisk | 42 | 42 | below_target | Resolve formal beta score gates outside analytics dedupe; do not fake runtime/provider evidence. |
| regressionRisk | 94 | 94 | target_met | No global/user dedupe score action needed for this dimension. |
| overallHealthScore | 90.16 | 90.16 | target_met | No global/user dedupe score action needed for this dimension. |

## Dirty Files

- agent/state/global-user-counting-math.generated.json: stale_generated_artifact_to_regenerate
- agent/state/global-user-dedupe-normalization.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/global-user-counting-math.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/global-user-dedupe-normalization.md: release_artifact_expected
- src/lib/analytics/global-user-dedupe-engine.ts: real_source_change_needs_review
- tests/unit/global-user-dedupe-normalization.spec.ts: test_artifact_expected

## Validation Failures

- none
