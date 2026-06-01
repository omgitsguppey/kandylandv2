# Score Dimension 80 Lock

Generated: 2026-06-01T00:32:30.050Z

Current head: e538c41e9de8827da5103b8bcb281cab184737c9

## Dimension Status

| Dimension | Before | After | Status | Root cause | Next action |
| --- | ---: | ---: | --- | --- | --- |
| sourceHealth | 91.7 | 92.5 | at_or_above_80 | meets_target | No score action needed for this dimension. |
| runtimeHealth | 84.2 | 84.2 | at_or_above_80 | meets_target | No score action needed for this dimension. |
| evidenceCompleteness | 69.6 | 69.6 | below_80 | formal_evidence_gate_required | Attach formal provider, deployed runtime, and production admin truth evidence before clearing beta gates. Remaining gates: formal_provider_smoke, deployed_runtime_smoke, production_admin_truth_sample. |
| freshness | 67.5 | 75.63 | below_80 | stale_score_artifact | Refresh agent/state/final-pr-stale-cleanup.generated.json with npm run check:final-pr-stale-cleanup. |
| costRisk | 42 | 42 | below_80 | cost_external_review_required | Review Cloud Run/App Hosting billing and deployed scheduler behavior externally before claiming full cost proof. |
| regressionRisk | 86 | 86 | at_or_above_80 | meets_target | No score action needed for this dimension. |
| overallHealthScore | 76.61 | 78.03 | below_80 | formal_evidence_gate_required | Attach formal provider, deployed runtime, and production admin truth evidence before clearing beta gates. Remaining gates: formal_provider_smoke, deployed_runtime_smoke, production_admin_truth_sample. |

## Remaining Formal Gates

- formal_provider_smoke
- deployed_runtime_smoke
- production_admin_truth_sample

## Stale Artifacts Remaining

- agent/state/final-pr-stale-cleanup.generated.json: stale_source_version; Final PR stale cleanup was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:final-pr-stale-cleanup; command=npm run check:final-pr-stale-cleanup
- agent/state/existing-algorithm-refinement.generated.json: stale_source_version; Existing algorithm refinement was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:existing-algorithm-refinement; command=npm run check:existing-algorithm-refinement

## Cost Owner Review Remaining

- cloudRun: source_guarded_external_review_remaining; Review Cloud Run/App Hosting billing and deployed scheduler behavior externally before claiming full cost proof.
- cloudSqlDataConnect: source_ready_no_runtime_usage_detected; Map Cloud SQL/Data Connect instance state, backups, HA, and billing owner in provider console.
- geminiCloudAssistVertex: source_guarded_external_review_remaining; Review Gemini/Vertex billing externally and keep future AI calls explicit, cached/idempotent, and rate-limited.
- bigQuery: source_ready_batched_or_cached; Verify BigQuery provider heartbeat/billing externally before treating warehouse evidence as full proof.
- scheduledRuntimeJobs: source_ready_batched_or_cached; Review deployed scheduler cadence and function billing externally before full closure.

## In-Flight Lanes

- event-liveness-audit: Event liveness implementation is dirty/in-flight; keep it out of this regression refresh commit and rerun when landed.
