# Beta Score Cleanup

Artifact: `agent/state/beta-score-cleanup.generated.json`
Validator: `npm run check:beta-score-cleanup`

Generated: 2026-06-19T15:05:02.381Z
Current source head: `e947d82891dfc7957cb4b9b9972d6378605a927d`

## Summary

- Beta score: 76.88/100, `External proof required`.
- Scanner score: 100/100. This is scanner-only source hygiene, not beta readiness.
- Evidence score: 46/100.
- Evidence caps represented: 3.
- Cost-readiness lanes represented: 4.
- Beta exit review can start: no.

## Score Explanation

- Source safety contributes 25 points because deterministic scanner findings are clean.
- Targeted behavior contributes 20 points because source/economy/user-creator validators pass.
- Freshness integrity contributes 10 points because legacy launch reports are retired from required freshness math and current source evidence artifacts are represented.
- Visual/manual, runtime/provider, admin truth, and debug/runtime evidence lanes still score zero until formal artifacts exist.

Missing evidence caps:

- Source validation only: Targeted behavior tests - Source behavior passed; formal runtime, provider, and admin proof stay separate.
- External proof required: Runtime/provider smoke - Refresh formal provider proof and deployed runtime smoke evidence.
- External proof required: Admin truth/sample evidence - Refresh the redacted production admin truth sample.

Scanner score 100 is scanner-only source hygiene and must never be read as beta readiness.

## Cost Readiness

- cloudRunCostReadiness: `cost_review_required` - Cloud Run/App Hosting still needs current source guard evidence before owner-review can be refined.
- cloudSqlCostReadiness: `owner_review_external_billing_required` - Cloud SQL/Data Connect source or external billing state still needs owner review.
- geminiCloudAssistCostReadiness: `cost_review_required` - AI cost lane lacks enough source guard evidence for refinement.
- route4xxReadiness: `cost_review_required` - Route 4xx readiness needs current diagnostics and retry classification.

These lanes are source inventory and owner-review signals. `not_detected_in_repo`, `config_not_in_repo`, and `source_inventory_complete` are not formal beta-exit passes.

## Stale Report Classification

- final-launch-readiness-report: `retired` - Do not use as required beta score freshness; keep as historical launch evidence only.
- launch-readiness-report: `retired` - Do not use as required beta score freshness.
- launch-pr-triage: `retired` - Do not block score freshness on this legacy report.
- repo-spring-cleaning-rewire: `archive` - Refresh only in the repo-governance owner lane.
- debug-panel-output-triage: `archive` - Do not treat as current runtime evidence without a fresh owner pass.
- speed-security-hardening: `active` - Keep P2 cost/security backlog visible; refresh through speed/security owner work.
- public-beta-score: `active` - Regenerate with npm run score:beta after source or evidence artifact changes.

## Next Exact Steps

1. Run UI source coverage before optional visual reproduction.
2. Attach formal provider smoke evidence before clearing provider caps.
3. Attach deployed runtime smoke evidence before clearing runtime caps.
4. Attach a fresh admin truth sample before clearing admin truth caps.
5. Review Cloud Run/App Hosting, Cloud SQL/Data Connect, and Gemini/Vertex cost lanes with owner evidence before beta exit.
