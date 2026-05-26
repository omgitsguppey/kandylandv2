# SQL Database Parity Cost Lock

Generated: 2026-05-26T04:49:32.008Z
Status: pass
Current head: a81cdb0b885f65dec63a582e4b9fe4cfdfeced39

## Contract

- Raw event facts map to normalized export rows without becoming runtime product truth.
- Global summaries, user summaries, person metrics, session summaries, journey summaries, and export rows share dedupe keys or record mismatches.
- BigQuery export remains daily/watermark batched; no per-event export trigger is allowed.
- Cloud SQL/Data Connect mirror sync remains manual, guarded, and external-review separated.
- Admin/debug reads summaries first and uses paged drilldowns for raw detail.

## Debug Lane

- Label: SQL/database parity
- Parity: matched
- Mismatches: 0
- Export freshness: current
- Cost guard: batched_summary_first
- Blocked external review: true

## Score Impact

| Dimension | Before | After | Status | Next action |
| --- | ---: | ---: | --- | --- |
| sourceHealth | 100 | 100 | target_met | No SQL parity score action needed for this dimension. |
| runtimeHealth | 84.2 | 84.2 | target_met | No SQL parity score action needed for this dimension. |
| evidenceCompleteness | 84.6 | 84.6 | target_met | No SQL parity score action needed for this dimension. |
| freshness | 91.88 | 91.88 | target_met | No SQL parity score action needed for this dimension. |
| costRisk | 80.5 | 80.5 | target_met | No SQL parity score action needed for this dimension. |
| regressionRisk | 86 | 86 | target_met | No SQL parity score action needed for this dimension. |
| overallHealthScore | 89.19 | 89.19 | target_met | No SQL parity score action needed for this dimension. |

## Dirty Files

- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/auth-readiness-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/chat-functionality-score-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/cost-risk-exit-pass.generated.json: stale_sql_export_materializer_logic_to_remove
- agent/state/creator-monetization-readiness-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-debug-score-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/final-parity-telemetry-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/freshness-window-repair.generated.json: stale_generated_artifact_to_regenerate
- agent/state/launch-blocker-evidence-closure.generated.json: stale_generated_artifact_to_regenerate
- agent/state/media-discovery-score-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/notification-pwa-score-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/targeted-behavior-evidence-repair.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/auth-readiness-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/chat-functionality-score-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/cost-risk-exit-pass.md: stale_sql_export_materializer_logic_to_remove
- docs/agent-truth/creator-monetization-readiness-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-debug-score-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/final-parity-telemetry-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/freshness-window-repair.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/launch-blocker-evidence-closure.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/media-discovery-score-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/notification-pwa-score-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/targeted-behavior-evidence-repair.md: stale_generated_artifact_to_regenerate

## Validation Failures

- none
