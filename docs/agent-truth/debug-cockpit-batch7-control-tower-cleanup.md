# Debug Cockpit Batch7 Control Tower Cleanup

Generated Control Tower cleanup evidence. Formal gates remain visible but are not source-code bugs.

```json
{
  "generatedAtUtc": "2026-05-24T17:43:47.801Z",
  "reportKey": "debug-cockpit-batch7-control-tower-cleanup",
  "currentHead": "5c126a7df36e39be20ab55b40ce5d14c04779fb5",
  "canonicalScoreBefore": {
    "score": 79,
    "status": "stale evidence",
    "source": "stale control tower display"
  },
  "canonicalScoreAfter": {
    "score": 79,
    "status": "Stale evidence",
    "source": "agent/state/public-beta-score.generated.json"
  },
  "evidenceScoreBefore": 65.7,
  "evidenceScoreAfter": 65.7,
  "requiredReportsBefore": 6,
  "requiredReportsAfter": 11,
  "staleReportsBefore": 6,
  "staleReportsAfter": 4,
  "refreshedReports": [
    "agent/state/public-beta-score.generated.json",
    "agent/state/current-beta-exit-status.generated.json",
    "agent/state/telemetry-parity-score.generated.json",
    "agent/state/debug-runtime-evidence.generated.json",
    "agent/state/evidence-capture-status.generated.json",
    "agent/state/formal-evidence-bridge.generated.json"
  ],
  "retiredReports": [
    "agent/state/admin-truth-sample-evidence.generated.json",
    "agent/state/final-launch-readiness-report.generated.json",
    "agent/state/score-80-path-lock.generated.json"
  ],
  "formalGatesRemaining": [
    "runtime_provider_smoke",
    "deployed_runtime_smoke",
    "admin_truth_sample_artifact"
  ],
  "operatorConfirmedSignals": [
    "$50 GumDrop payment operator-confirmed; formal provider artifact remains separate."
  ],
  "adminTruthStatusBefore": "unknown",
  "adminTruthStatusAfter": "source_ready_formal_sample_required",
  "telemetryParityStatusBefore": "clean_but_stale_display",
  "telemetryParityStatusAfter": "clean_current",
  "costLaneQueueStatus": "collapsed_score_impact_zero",
  "aiCriticStatusBefore": "request_changes",
  "aiCriticStatusAfter": "no_source_changes_requested",
  "recoveryPlaybooksVisibleBefore": 1,
  "recoveryPlaybooksVisibleAfter": 0,
  "scoreImpactQueueBefore": [
    "runtime_provider_smoke",
    "debug_runtime_evidence",
    "agent/state/score-80-path-lock.generated.json",
    "cost-owner-review"
  ],
  "scoreImpactQueueAfter": [],
  "actionableSourceIssues": [],
  "formalEvidenceItems": [
    "runtime_provider_smoke",
    "debug_runtime_evidence"
  ],
  "externalReviewItems": [
    "cost-owner-review"
  ],
  "collapsedInfoItems": [
    "score-impact-zero-cost",
    "formal-playbooks",
    "superseded-score-80-path-lock"
  ],
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
      "path": "agent/state/debug-panel-output-triage.generated.json",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "agent/state/debug-runtime-evidence.generated.json",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "agent/state/evidence-capture-status.generated.json",
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
      "path": "agent/state/telemetry-admin-debug-truth.generated.json",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "agent/state/telemetry-parity-score.generated.json",
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
      "path": "docs/agent-truth/debug-runtime-evidence.md",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "docs/agent-truth/evidence-capture-status.md",
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
      "path": "docs/agent-truth/telemetry-admin-debug-truth.md",
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
      "classification": "source_fix_required"
    },
    {
      "path": "src/lib/admin-debug-control-tower.ts",
      "classification": "stale_control_tower_logic_to_remove"
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
      "path": "agent/state/control-tower-canonical-source.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "agent/state/control-tower-formal-gate-display.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "agent/state/control-tower-operator-queue-cleanup.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "agent/state/control-tower-report-freshness-cleanup.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "agent/state/debug-cockpit-batch7-control-tower-cleanup.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "docs/agent-truth/control-tower-canonical-source.md",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "docs/agent-truth/control-tower-formal-gate-display.md",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "docs/agent-truth/control-tower-operator-queue-cleanup.md",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "docs/agent-truth/control-tower-report-freshness-cleanup.md",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "docs/agent-truth/debug-cockpit-batch7-control-tower-cleanup.md",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "scripts/agent/control-tower-cleanup-shared.ts",
      "classification": "source_fix_required"
    },
    {
      "path": "scripts/agent/validate-control-tower-canonical-source.ts",
      "classification": "source_fix_required"
    },
    {
      "path": "scripts/agent/validate-control-tower-formal-gate-display.ts",
      "classification": "source_fix_required"
    },
    {
      "path": "scripts/agent/validate-control-tower-operator-queue-cleanup.ts",
      "classification": "source_fix_required"
    },
    {
      "path": "scripts/agent/validate-control-tower-report-freshness-cleanup.ts",
      "classification": "source_fix_required"
    },
    {
      "path": "scripts/agent/validate-debug-cockpit-batch7-control-tower-cleanup.ts",
      "classification": "source_fix_required"
    },
    {
      "path": "src/lib/agent-score/formal-gate-display.ts",
      "classification": "formal_evidence_gate_to_keep_visible"
    },
    {
      "path": "src/lib/debug/control-tower-canonical-source.ts",
      "classification": "stale_control_tower_logic_to_remove"
    },
    {
      "path": "src/lib/debug/report-freshness-control-tower.ts",
      "classification": "stale_control_tower_logic_to_remove"
    },
    {
      "path": "tests/unit/control-tower-canonical-source.spec.ts",
      "classification": "source_fix_required"
    },
    {
      "path": "tests/unit/control-tower-formal-gate-display.spec.ts",
      "classification": "source_fix_required"
    },
    {
      "path": "tests/unit/control-tower-operator-queue-cleanup.spec.ts",
      "classification": "source_fix_required"
    },
    {
      "path": "tests/unit/control-tower-report-freshness-cleanup.spec.ts",
      "classification": "source_fix_required"
    },
    {
      "path": "tests/unit/debug-cockpit-batch7-control-tower-cleanup.spec.ts",
      "classification": "source_fix_required"
    }
  ],
  "remainingGaps": [
    "Formal provider smoke evidence remains required.",
    "Deployed runtime smoke evidence remains required.",
    "Redacted first-party admin truth sample remains required."
  ],
  "nextExactSteps": [
    "Attach formal provider smoke evidence before clearing provider gate.",
    "Attach deployed runtime smoke evidence before clearing runtime gate.",
    "Attach redacted first-party admin truth sample before clearing admin truth gate."
  ]
}
```
