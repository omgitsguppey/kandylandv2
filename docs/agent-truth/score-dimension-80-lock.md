# Score Dimension 80 Lock

Generated: 2026-06-01T04:56:01.867Z

Current head: c525024240902c3f2ca716c01015c3cb6b25997b

## Dimension Status

| Dimension | Before | After | Status | Root cause | Next action |
| --- | ---: | ---: | --- | --- | --- |
| sourceHealth | 92.5 | 92.5 | at_or_above_80 | meets_target | No score action needed for this dimension. |
| runtimeHealth | 84.2 | 84.2 | at_or_above_80 | meets_target | No score action needed for this dimension. |
| evidenceCompleteness | 69.6 | 69.6 | below_80 | formal_evidence_gate_required | Attach formal provider, deployed runtime, and production admin truth evidence before clearing beta gates. Remaining gates: formal_provider_smoke, deployed_runtime_smoke, production_admin_truth_sample. |
| freshness | 75.63 | 75.63 | below_80 | stale_score_artifact | Refresh agent/state/current-beta-exit-status.generated.json with npm run check:current-beta-exit-status. |
| costRisk | 42 | 42 | below_80 | cost_external_review_required | Review Cloud Run/App Hosting billing and deployed scheduler behavior externally before claiming full cost proof. |
| regressionRisk | 86 | 86 | at_or_above_80 | meets_target | No score action needed for this dimension. |
| overallHealthScore | 78.03 | 78.03 | below_80 | formal_evidence_gate_required | Attach formal provider, deployed runtime, and production admin truth evidence before clearing beta gates. Remaining gates: formal_provider_smoke, deployed_runtime_smoke, production_admin_truth_sample. |

## Remaining Formal Gates

- formal_provider_smoke
- deployed_runtime_smoke
- production_admin_truth_sample

## Stale Artifacts Remaining

- agent/state/current-beta-exit-status.generated.json: stale_source_version; Current beta exit status was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:current-beta-exit-status; command=npm run check:current-beta-exit-status
- agent/state/evidence-capture-status.generated.json: stale_source_version; Evidence capture status was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:evidence-capture-status; command=npm run check:evidence-capture-status
- agent/state/source-truth-authority-map.generated.json: stale_source_version; Source truth authority map was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:source-truth-authority-map; command=npm run check:source-truth-authority-map
- agent/state/final-telemetry-closure-lock.generated.json: stale_source_version; Telemetry closure lock was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:final-telemetry-closure-lock; command=npm run check:final-telemetry-closure-lock
- agent/state/mobile-ui-final-lock.generated.json: stale_source_version; Mobile UI final lock was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:mobile-ui-final-lock; command=npm run check:mobile-ui-final-lock
- agent/state/overnight-final-integration-lock.generated.json: stale_source_version; Overnight final integration lock was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:overnight-final-integration-lock; command=npm run check:overnight-final-integration-lock
- agent/state/creator-settings-control-plane.generated.json: stale_source_version; Creator settings control plane was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:creator-settings-control-plane; command=npm run check:creator-settings-control-plane
- agent/state/creator-drop-status-metrics.generated.json: stale_source_version; Creator drop status metrics was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:creator-drop-status-metrics; command=npm run check:creator-drop-status-metrics
- agent/state/operator-revenue-smoke.generated.json: stale_source_version; Operator revenue smoke was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:operator-revenue-smoke; command=npm run check:operator-revenue-smoke
- agent/state/beta-evidence-gap-map.generated.json: stale_source_version; Beta evidence gap map was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:beta-evidence-gap-map; command=npm run check:beta-evidence-gap-map
- agent/state/beta-evidence-lane-prep.generated.json: stale_source_version; Beta evidence lane prep was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:beta-evidence-lane-prep; command=npm run check:beta-evidence-lane-prep
- agent/state/beta-freshness-language.generated.json: stale_source_version; Beta freshness language was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:beta-freshness-language; command=npm run check:beta-freshness-language
- agent/state/final-pr-stale-cleanup.generated.json: stale_source_version; Final PR stale cleanup was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:final-pr-stale-cleanup; command=npm run check:final-pr-stale-cleanup
- agent/state/overnight-wiring-integrity.generated.json: stale_source_version; Overnight wiring integrity was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:overnight-wiring-integrity; command=npm run check:overnight-wiring-integrity
- agent/state/existing-algorithm-refinement.generated.json: stale_source_version; Existing algorithm refinement was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:existing-algorithm-refinement; command=npm run check:existing-algorithm-refinement
- agent/state/user-loading-wallet-mobile-refinement.generated.json: stale_source_version; User loading and wallet mobile refinement was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:user-loading-wallet-mobile-refinement; command=npm run check:user-loading-wallet-mobile-refinement
- agent/state/global-marquee-truncated-titles.generated.json: stale_source_version; Global marquee title rollout was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:global-marquee-truncated-titles; command=npm run check:global-marquee-truncated-titles

## Cost Owner Review Remaining

- cloudRun: source_guarded_external_review_remaining; Review Cloud Run/App Hosting billing and deployed scheduler behavior externally before claiming full cost proof.
- cloudSqlDataConnect: source_ready_no_runtime_usage_detected; Map Cloud SQL/Data Connect instance state, backups, HA, and billing owner in provider console.
- geminiCloudAssistVertex: source_guarded_external_review_remaining; Review Gemini/Vertex billing externally and keep future AI calls explicit, cached/idempotent, and rate-limited.
- bigQuery: source_ready_batched_or_cached; Verify BigQuery provider heartbeat/billing externally before treating warehouse evidence as full proof.
- scheduledRuntimeJobs: source_ready_batched_or_cached; Review deployed scheduler cadence and function billing externally before full closure.

## In-Flight Lanes

- event-liveness-audit: Event liveness implementation is dirty/in-flight; keep it out of this regression refresh commit and rerun when landed.
