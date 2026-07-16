# Beta Score Cleanup

Artifact: `agent/state/beta-score-cleanup.generated.json`
Validator: `npm run check:beta-score-cleanup`

Generated: 2026-07-16T21:26:31.878Z
Current source head: `78060565020da1d7272253f2f5727d35910dfc42`

## Summary

- Beta score: 52.19/100, `Stale evidence`.
- Scanner score: 100/100. This is scanner-only source hygiene, not beta readiness.
- Evidence score: 35/100.
- Evidence caps represented: 3.
- Cost-readiness lanes represented: 4.
- Beta exit review can start: no.

## Score Explanation

- Source safety contributes 25 points because deterministic scanner findings are clean.
- Targeted behavior contributes 20 points because source/economy/user-creator validators pass.
- Freshness integrity contributes 10 points because legacy launch reports are retired from required freshness math and current source evidence artifacts are represented.
- Visual/manual compatibility, provider-backed site activity, deployed route, admin source activity, and debug/runtime evidence lanes still score zero until typed artifacts exist.

Missing evidence caps:

- Stale evidence: Provider-backed source activity evidence - Refresh provider-backed source activity evidence and deployed runtime route evidence for the current code version.
- Stale evidence: Protected payment source-of-funds proof - Attach a current redacted provider-backed artifact that validates payment and GumDrop source-of-funds checks.
- Stale evidence: Admin source activity evidence - Refresh redacted admin source activity evidence.

Scanner score 100 is scanner-only source hygiene and must never be read as beta readiness.

## Cost Readiness

- cloudRunCostReadiness: `cost_review_required` - Cloud Run/App Hosting still needs current source guard evidence before owner-review can be refined.
- cloudSqlCostReadiness: `source_ready_no_runtime_usage_detected` - Runtime SQL/Data Connect usage is not detected and mirror sync is manually guarded; provider instance billing still needs owner review.
- geminiCloudAssistCostReadiness: `source_guarded_external_review_remaining` - AI routes are explicit admin-action guarded with rate/cache protection; external Gemini/Vertex billing remains owner-review.
- route4xxReadiness: `source_ready_retry_storm_guarded` - Latest diagnostics classify 4xx/retry paths source-side and avoid generic retry-storm owner review.

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
2. Produce provider-backed site activity evidence before clearing provider caps.
3. Produce deployed route evidence before clearing runtime caps.
4. Produce a fresh admin source activity sample before clearing admin caps.
5. Review Cloud Run/App Hosting, Cloud SQL/Data Connect, and Gemini/Vertex cost lanes with owner evidence before beta exit.
