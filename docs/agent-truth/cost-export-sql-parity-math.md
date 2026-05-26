# Cost Export SQL Parity Math

Generated: 2026-05-26T11:27:33.861Z
Current head: 14264ff8
Status: pass

## Contract

- Hot path writes only essential facts and summaries.
- Non-critical analytics refresh daily by default.
- BigQuery export is scheduled, batched, and watermark-based, never per-event.
- SQL/Data Connect mirror sync is manual and cost-approved only.
- Admin/debug defaults read compact summaries with paged raw drilldowns.
- Cost risk source guards earn partial credit; external billing proof remains separate.
- Cost reduction preserves canonical metric facts and reduces duplicate reads, writes, or refresh frequency instead.

## Debug Lane

- Label: Cost/export math
- Hot path risk: low
- Export batch status: watermark_batch
- Admin read risk: low
- SQL mirror guard: manual_cost_approved_only
- Accuracy preserved: true

## Score

- Before: {"sourceHealth":100,"runtimeHealth":84.2,"evidenceCompleteness":84.6,"freshness":91.88,"costRisk":80.5,"regressionRisk":86,"overallHealthScore":89.19}
- After: {"sourceHealth":100,"runtimeHealth":84.2,"evidenceCompleteness":84.6,"freshness":91.88,"costRisk":80.5,"regressionRisk":86,"overallHealthScore":89.19}
- Dimensions: sourceHealth, runtimeHealth, evidenceCompleteness, freshness, costRisk, regressionRisk

## Remaining Gaps

- External billing/provider review remains required before full cost closure.
- Cloud Run/App Hosting, Cloud SQL/Data Connect, and Gemini/Cloud Assist/Vertex still need external billing artifacts for full credit.

## Next Exact Steps

- Attach external billing/provider evidence before moving costRisk from source-guarded partial credit to full credit.
- Keep BigQuery export on daily watermark batches and Cloud SQL mirror sync manual/cost-approved only.
- Keep admin/debug default reads summary-first with paged raw drilldowns.

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/state/cost-export-sql-parity-math.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/cost-export-sql-parity-math.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-cost-export-sql-parity-math.ts: validator_artifact_expected
- src/lib/math/cost-export-parity-math.ts: current_source_change
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/cost-export-sql-parity-math.spec.ts: test_artifact_expected

## Open PRs

- #302: onboarding_telemetry_external_review_required
- #301: doctrine_governance_external_review_required
- #300: architecture_refactor_external_review_required
- #299: dependency_update_external_review_required
- #298: dependency_update_external_review_required
- #297: dependency_update_external_review_required
- #296: dependency_update_external_review_required
- #295: dependency_update_external_review_required
- #294: dependency_update_external_review_required
- #293: security_patch_external_review_required
- #292: performance_patch_external_review_required
- #291: accessibility_patch_external_review_required

## Validation Failures

- none
