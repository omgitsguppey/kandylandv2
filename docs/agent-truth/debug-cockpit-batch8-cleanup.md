# Debug Cockpit Batch8 Cleanup

Generated Batch 8 cleanup evidence. Business truth remains separate from ops-health and generic recovery playbooks stay collapsed unless they match active issues.

```json
{
  "generatedAtUtc": "2026-05-24T18:07:19.142Z",
  "reportKey": "debug-cockpit-batch8-cleanup",
  "currentHead": "6d038e7f7d9b7cef83d276f39bd968df83bb988d",
  "recoveryPlaybookStatusBefore": "degraded",
  "recoveryPlaybookStatusAfter": "collapsed_no_active_issue",
  "visiblePlaybooksBefore": 3,
  "visiblePlaybooksAfter": 0,
  "collapsedPlaybooks": [
    "stale_artifact_recovery",
    "debug_runtime_unknown_recovery",
    "admin_truth_unknown_recovery"
  ],
  "businessTruthStatusBefore": "source_ready_stale_snapshot",
  "businessTruthStatusAfter": "low_confidence_review",
  "businessTruthFreshnessBefore": "stale",
  "businessTruthFreshnessAfter": "stale_snapshot_with_reason",
  "businessTruthConfidenceBefore": 74,
  "businessTruthConfidenceAfter": 74,
  "businessTruthMetrics": {
    "users": 864,
    "purchases": 67,
    "revenueUsd": 573,
    "unwraps": 210,
    "watchMinutes": 21
  },
  "metricSources": {
    "users": {
      "path": "AdminUserTruthSnapshot.totalUsers",
      "sourceClass": "admin_snapshot_canonical"
    },
    "purchases": {
      "path": "AdminUserTruthSnapshot.verifiedPurchases",
      "sourceClass": "operator_confirmed_provider_formal_missing"
    },
    "revenue": {
      "path": "AdminUserTruthSnapshot.totalRevenueUsd",
      "sourceClass": "operator_confirmed_provider_formal_missing"
    },
    "unwraps": {
      "path": "AdminUserTruthSnapshot.trackedUnwraps",
      "sourceClass": "admin_snapshot_canonical",
      "duplicatePolicy": "deduped_admin_snapshot"
    },
    "watch": {
      "path": "AdminUserTruthSnapshot.validWatchTimeMs",
      "sourceClass": "valid_watch_time",
      "canUsePageTime": false
    }
  },
  "watchSourceClass": "valid_watch_time",
  "revenueSourceClass": "operator_confirmed_provider_formal_missing",
  "opsHealthInherited": false,
  "scoreBefore": 79,
  "scoreAfter": 79,
  "scoreDimensions": {
    "sourceHealth": 92.5,
    "runtimeHealth": 84.2,
    "evidenceCompleteness": 69.6,
    "freshness": 83.75,
    "costRisk": 42,
    "regressionRisk": 86,
    "overallHealthScore": 79.25
  },
  "dirtyFileClassifications": [
    {
      "path": "CHANGELOG.md",
      "classification": "release_artifact_expected"
    },
    {
      "path": "agent/state/admin-truth-source-sample.generated.json",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "agent/state/current-beta-exit-status.generated.json",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "agent/state/debug-backlog-engine.generated.json",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "agent/state/drop-watch-time-accuracy.generated.json",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "agent/state/formal-evidence-bridge.generated.json",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "agent/state/overnight-beta-readiness-lock.generated.json",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "agent/state/public-beta-score.generated.json",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "agent/state/sql-database-parity-cost-lock.generated.json",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "docs/agent-truth/admin-truth-source-sample.md",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "docs/agent-truth/current-beta-exit-status.md",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "docs/agent-truth/debug-backlog-engine.md",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "docs/agent-truth/drop-watch-time-accuracy.md",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "docs/agent-truth/formal-evidence-bridge.md",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "docs/agent-truth/overnight-beta-readiness-lock.md",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "docs/agent-truth/sql-database-parity-cost-lock.md",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "package.json",
      "classification": "release_artifact_expected"
    },
    {
      "path": "public/kandydrops-release-notes.json",
      "classification": "release_artifact_expected"
    },
    {
      "path": "scripts/agent/validate-admin-debug-control-tower.ts",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "scripts/agent/validate-drop-watch-time-accuracy.ts",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "scripts/agent/validate-sql-database-parity-cost-lock.ts",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "src/app/admin/debug/components/DebugControlTowerBusinessTruth.tsx",
      "classification": "stale_business_truth_status_logic_to_remove"
    },
    {
      "path": "src/lib/release-notes/public-release-notes.ts",
      "classification": "release_artifact_expected"
    },
    {
      "path": "src/lib/release-notes/release-version-contract.ts",
      "classification": "release_artifact_expected"
    },
    {
      "path": "agent/state/canonical-business-truth-refresh.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "agent/state/canonical-business-truth-status.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "agent/state/debug-cockpit-batch8-cleanup.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "agent/state/recovery-playbook-cta-cleanup.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "docs/agent-truth/canonical-business-truth-refresh.md",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "docs/agent-truth/canonical-business-truth-status.md",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "docs/agent-truth/debug-cockpit-batch8-cleanup.md",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "docs/agent-truth/recovery-playbook-cta-cleanup.md",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "scripts/agent/business-truth-recovery-shared.ts",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "scripts/agent/validate-canonical-business-truth-refresh.ts",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "scripts/agent/validate-canonical-business-truth-status.ts",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "scripts/agent/validate-debug-cockpit-batch8-cleanup.ts",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "scripts/agent/validate-recovery-playbook-cta-cleanup.ts",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "src/lib/debug/canonical-business-truth-status.ts",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "src/lib/debug/recovery-playbook-visibility.ts",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "tests/unit/canonical-business-truth-refresh.spec.ts",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "tests/unit/canonical-business-truth-status.spec.ts",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "tests/unit/debug-cockpit-batch8-cleanup.spec.ts",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "tests/unit/recovery-playbook-cta-cleanup.spec.ts",
      "classification": "real_source_change_needs_review"
    }
  ],
  "remainingGaps": [
    "Business truth confidence remains below 80 until bounded admin truth source sample is refreshed and reviewed.",
    "Formal admin sample remains required before clearing the formal evidence gate."
  ],
  "nextExactSteps": [
    "Refresh admin truth source sample with npm run check:admin-truth-source-sample.",
    "Attach redacted first-party admin truth sample for formal evidence closure.",
    "Keep recovery playbook CTAs collapsed unless a matching active issue returns."
  ]
}
```
