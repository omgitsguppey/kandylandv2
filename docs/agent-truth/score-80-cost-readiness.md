# Score 80 Cost Readiness

Generated: 2026-06-21T03:58:41.666Z

Latest code version: c53978beb10283d481e7a0d5c1e943fb01056eab

## Summary

- Cost risk score: 68.5
- Latest cost locks preferred: true
- External owner review still required: true
- Stale creator dashboard inventory ignored: true
- Explanation: Cost risk score 68.5 gives source readiness and source cost readiness credit for guarded current cost locks and route 4xx closure, while external billing evidence and owner review remain separate.

## Cost Lanes

| Lane | Status | Detail |
| --- | --- | --- |
| cloudRunCostReadiness | source_guarded_external_review_remaining | Cloud Run/App Hosting has source guard coverage; deployed billing review remains external. |
| cloudSqlCostReadiness | owner_review_external_billing_required | Cloud SQL/Data Connect source or external billing state still needs owner review. |
| geminiCloudAssistCostReadiness | cost_review_required | AI cost lane lacks enough source guard evidence for refinement. |
| route4xxReadiness | source_ready_retry_storm_guarded | Latest diagnostics classify 4xx/retry paths source-side and avoid generic retry-storm owner review. |

## Validator Inputs

| Command | Status | Artifact | Detail |
| --- | --- | --- | --- |
| npm run check:final-cost-audit-lock | failed_or_not_run | agent/state/final-cost-audit-lock.generated.json | Final cost lock is missing or stale. |
| npm run check:cost-risk-exit-pass | failed_or_not_run | agent/state/cost-risk-exit-pass.generated.json | Cost risk exit pass is missing or stale. |
| npm run check:cost-risk-owner-review-closure | failed_or_not_run | agent/state/cost-risk-owner-review-closure.generated.json | Cost risk owner-review closure is missing or stale. |
| npm run check:cost-owner-review-source-closure | pass | agent/state/cost-owner-review-source-closure.generated.json | Current cost owner-review source closure is available. |
| npm run check:cloud-sql-gemini-cost-guards | failed_or_not_run | agent/state/cloud-sql-gemini-cost-guards.generated.json | Cloud SQL/Gemini guard report is missing or stale. |
| npm run check:global-cost-surfaces | pass | agent/state/global-cost-surfaces.generated.json | Global cost source surfaces are clean supporting context; this is not external billing evidence. |
| npm run check:billing-spike-radar | pass | agent/state/billing-spike-radar.generated.json | Billing spike radar is supporting watchlist context; warnings do not become external billing evidence. |
| npm run check:analytics-cost-runtime-inventory | failed_or_not_run | agent/state/analytics-cost-runtime-inventory.generated.json | Analytics cost runtime inventory refresh is tracked separately from external billing evidence. |

## Boundary

This report gives source cost readiness credit only. It does not claim external billing savings, Cloud SQL closure, Gemini/Vertex closure, or deployed Cloud Run cost evidence.

## Next Steps

- Use current final cost and telemetry locks as beta score cost input.
- Owner-review Cloud SQL/Data Connect and Gemini/Vertex billing externally before claiming provider savings.
- Keep stale creator-dashboard-only cost inventory out of primary cost scoring when newer source locks exist.
- Attach external billing evidence separately before claiming provider-side cost savings.
