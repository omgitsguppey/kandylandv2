# Cost Risk Exit Pass

Status: `pass`
Artifact: `agent/state/cost-risk-exit-pass.generated.json`
Validator: `npm run check:cost-risk-exit-pass`

## Summary

- Current head: `a81cdb0b885f65dec63a582e4b9fe4cfdfeced39`
- Cost risk: 80.5 -> 80.5
- Source guarded lanes: 4
- Generic owner-review lanes: 0
- External billing reviewed: false
- External billing remaining: cloudRun, cloudSqlDataConnect, geminiCloudAssistVertex
- Formal evidence impact: `source_cost_guard_only_does_not_clear_provider_billing`
- Production reads/provider calls/deploys performed: false

## Score Dimensions

| Dimension | Before | After | Target |
| --- | ---: | ---: | ---: |
| sourceHealth | 100 | 100 | 80 |
| runtimeHealth | 84.2 | 84.2 | 80 |
| evidenceCompleteness | 84.6 | 84.6 | 80 |
| freshness | 91.88 | 91.88 | 80 |
| costRisk | 80.5 | 80.5 | 80 |
| regressionRisk | 86 | 86 | 80 |
| overallHealthScore | 89.19 | 89.19 | 80 |

## Exit Lanes

| Lane | Source guard status | Source guarded | External billing | Next action |
| --- | --- | --- | --- | --- |
| Cloud Run/App Hosting | source_guarded_external_review_remaining | true | external_billing_required | Review Cloud Run/App Hosting billing and deployed scheduler behavior externally before claiming full cost proof. |
| Cloud SQL/Data Connect | source_ready_no_runtime_usage_detected | true | external_billing_required | Map Cloud SQL/Data Connect instance state, backups, HA, and billing owner in provider console. |
| Gemini/Cloud Assist/Vertex AI | source_guarded_external_review_remaining | true | external_billing_required | Review Gemini/Vertex billing externally and keep future AI calls explicit, cached/idempotent, and rate-limited. |
| Route 4xx | source_ready_retry_storm_guarded | true | external_billing_not_required | Keep noisy 4xx routes typed, deduped, and non-retryable unless a validator proves retry is needed. |

## Dirty File Classification

| File | Classification |
| --- | --- |
| agent/context/optimized-task-context.generated.json | unrelated_agent_context_file_to_ignore |
| agent/state/freshness-window-repair.generated.json | stale_generated_artifact_to_regenerate |
| agent/state/targeted-behavior-evidence-repair.generated.json | stale_generated_artifact_to_regenerate |
| docs/agent-truth/freshness-window-repair.md | stale_generated_artifact_to_regenerate |
| docs/agent-truth/targeted-behavior-evidence-repair.md | stale_generated_artifact_to_regenerate |

## Stale Reference Classification

- `cost_review_required`: historical_reference - Generic cost review remains valid only when source guards are missing.
- `source_guarded_external_review_remaining`: source_guarded - Source guard can raise costRisk credit but does not prove provider billing.
- `owner_review_external_billing_required`: external_billing_required - Cloud SQL/Data Connect and Gemini/Vertex provider billing require external owner evidence.

## Boundary

This pass is source-only cost evidence. It does not claim dollar savings, provider billing review, deployed billing proof, production reads, provider calls, or deploy status.

## Next Exact Steps

- cloudRun: Review Cloud Run/App Hosting billing and deployed scheduler behavior externally before claiming full cost proof.
- cloudSqlDataConnect: Map Cloud SQL/Data Connect instance state, backups, HA, and billing owner in provider console.
- geminiCloudAssistVertex: Review Gemini/Vertex billing externally and keep future AI calls explicit, cached/idempotent, and rate-limited.
- Do not promote source cost guard evidence to external billing proof without a separate owner-reviewed artifact.

## Validation

- Pass.
