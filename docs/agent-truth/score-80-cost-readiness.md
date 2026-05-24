# Score 80 Cost Readiness

Generated: 2026-05-24T05:04:29.432Z

Latest code version: e7d4eb198c8b9f728589fe48b41345f295a854d1

## Summary

- Cost risk score: 80.5
- Latest cost locks preferred: true
- External owner review still required: true
- Stale creator dashboard inventory ignored: true
- Explanation: Cost risk score 80.5 gives source readiness and source cost readiness credit for guarded current cost locks and route 4xx closure, while external billing proof and owner review remain separate.

## Cost Lanes

| Lane | Status | Detail |
| --- | --- | --- |
| cloudRunCostReadiness | source_guarded_external_review_remaining | Cloud Run/App Hosting has source guard coverage; deployed billing review remains external. |
| cloudSqlCostReadiness | source_ready_no_runtime_usage_detected | Runtime SQL/Data Connect usage is not detected and mirror sync is manually guarded; provider instance billing still needs owner review. |
| geminiCloudAssistCostReadiness | source_guarded_external_review_remaining | AI routes are explicit admin-action guarded with rate/cache protection; external Gemini/Vertex billing remains owner-review. |
| route4xxReadiness | source_ready_retry_storm_guarded | Latest diagnostics classify 4xx/retry paths source-side and avoid generic retry-storm owner review. |

## Validator Inputs

| Command | Status | Artifact | Detail |
| --- | --- | --- | --- |
| npm run check:final-cost-audit-lock | failed_or_not_run | agent/state/final-cost-audit-lock.generated.json | Final cost lock is missing or stale. |
| npm run check:cost-risk-owner-review-closure | pass | agent/state/cost-risk-owner-review-closure.generated.json | Current cost risk owner-review closure is available. |
| npm run check:cost-owner-review-source-closure | failed_or_not_run | agent/state/cost-owner-review-source-closure.generated.json | Cost owner-review source closure is missing or stale. |
| npm run check:cloud-sql-gemini-cost-guards | failed_or_not_run | agent/state/cloud-sql-gemini-cost-guards.generated.json | Cloud SQL/Gemini guard report is missing or stale. |
| npm run check:global-cost-surfaces | missing_script | agent/state/global-cost-surfaces.generated.json | Package script is not present; existing global-cost source report is treated as supporting source context only. |
| npm run check:billing-spike-radar | missing_script | agent/state/billing-spike-radar.generated.json | Package script is not present; billing spike radar remains supporting watchlist context only. |
| npm run check:analytics-cost-runtime-inventory | failed_or_not_run | agent/state/analytics-cost-runtime-inventory.generated.json | Analytics cost runtime inventory refresh is tracked separately from external billing proof. |

## Boundary

This report gives source cost readiness credit only. It does not claim external billing savings, Cloud SQL closure, Gemini/Vertex closure, or deployed Cloud Run cost proof.

## Next Steps

- Use current final cost and telemetry locks as beta score cost input.
- Owner-review Cloud SQL/Data Connect and Gemini/Vertex billing externally before claiming provider savings.
- Keep stale creator-dashboard-only cost inventory out of primary cost scoring when newer source locks exist.
- Attach external billing evidence separately if the operator wants formal cost proof.
