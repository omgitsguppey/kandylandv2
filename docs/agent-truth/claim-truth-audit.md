# Claim Truth Audit

Artifact: `agent/state/claim-truth-audit.generated.json`
Validator: `npm run check:claim-truth-audit`

## Summary

- Generated: `2026-05-26T22:54:33.340Z`
- Current head: `ab170d4c0157ad2529b1e5c606d5ca65db1b3346`
- Validation status: `pass`

## Evidence Boundary

This is an automated source/artifact/package-script/import-shape audit. It does not run production reads, provider calls, deployment, manual visual QA, payment runtime, or GumDrop math changes. Formal provider/runtime/admin/manual gates remain unproven unless explicitly attached as formal artifacts.

## Report

```json
{
  "reportKey": "claim-truth-audit",
  "generatedAtUtc": "2026-05-26T22:54:33.340Z",
  "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
  "claims": [
    {
      "claimId": "4xx-cost-guardrails:pass:1",
      "sourceArtifact": "agent/state/4xx-cost-guardrails.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": "tests/unit/4xx-cost-guardrails.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "accessibility-tap-target-audit:pass:2",
      "sourceArtifact": "agent/state/accessibility-tap-target-audit.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "accessibility-tap-target-audit:current:3",
      "sourceArtifact": "agent/state/accessibility-tap-target-audit.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "account-settings-delete-flow:pass:4",
      "sourceArtifact": "agent/state/account-settings-delete-flow.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-account-settings-delete-flow.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-account-settings-delete-flow.ts"
      ],
      "referencedPackageScript": "check:account-settings-delete-flow",
      "referencedTest": "tests/unit/account-settings-delete-flow.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "80ff5ebbd6a11a027951de58f1c8e1e859295785",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "account-settings-mobile-padding:pass:5",
      "sourceArtifact": "agent/state/account-settings-mobile-padding.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-account-settings-mobile-padding.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-account-settings-mobile-padding.ts"
      ],
      "referencedPackageScript": "check:account-settings-mobile-padding",
      "referencedTest": "tests/unit/account-settings-mobile-padding.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "41548a214020ae5be78fc5b546d61b6c5b48fb40",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "activity-verification-engine:pass:6",
      "sourceArtifact": "agent/state/activity-verification-engine.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-activity-verification-engine.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-activity-verification-engine.ts"
      ],
      "referencedPackageScript": "check:activity-verification-engine",
      "referencedTest": "tests/unit/activity-verification-engine.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "79ad1387e6438832a915bed94e0cdbd3d4a7fddb",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "activity-verification-engine:ready:7",
      "sourceArtifact": "agent/state/activity-verification-engine.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-activity-verification-engine.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-activity-verification-engine.ts"
      ],
      "referencedPackageScript": "check:activity-verification-engine",
      "referencedTest": "tests/unit/activity-verification-engine.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "79ad1387e6438832a915bed94e0cdbd3d4a7fddb",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-debug-cost-reduction:pass:8",
      "sourceArtifact": "agent/state/admin-analytics-debug-cost-reduction.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-admin-analytics-debug-cost-reduction.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-analytics-debug-cost-reduction.ts"
      ],
      "referencedPackageScript": "check:admin-analytics-debug-cost-reduction",
      "referencedTest": "tests/unit/admin-analytics-debug-cost-reduction.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "3878a581193dd171f69e3c0b63073ac738c14152",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-finalization:pass:9",
      "sourceArtifact": "agent/state/admin-analytics-finalization.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-admin-analytics-finalization.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-analytics-finalization.ts"
      ],
      "referencedPackageScript": "check:admin-analytics-finalization",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-finalization:current:10",
      "sourceArtifact": "agent/state/admin-analytics-finalization.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-admin-analytics-finalization.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-analytics-finalization.ts"
      ],
      "referencedPackageScript": "check:admin-analytics-finalization",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-realtime-dependency-audit:current:11",
      "sourceArtifact": "agent/state/admin-analytics-realtime-dependency-audit.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-cms-workflow-audit:locked:12",
      "sourceArtifact": "agent/state/admin-cms-workflow-audit.generated.json",
      "claimText": "locked",
      "claimedStatus": "locked",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-cms-workflow-audit:complete:13",
      "sourceArtifact": "agent/state/admin-cms-workflow-audit.generated.json",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-cms-workflow-audit:current:14",
      "sourceArtifact": "agent/state/admin-cms-workflow-audit.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-surface-hydration:ready:15",
      "sourceArtifact": "agent/state/admin-surface-hydration.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-admin-surface-hydration.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-surface-hydration.ts"
      ],
      "referencedPackageScript": "check:admin-surface-hydration",
      "referencedTest": "tests/unit/admin-surface-hydration.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-truth-redaction-packet:formal_missing:16",
      "sourceArtifact": "agent/state/admin-truth-redaction-packet.generated.json",
      "claimText": "formal_missing",
      "claimedStatus": "formal_missing",
      "referencedValidator": "scripts/agent/validate-admin-truth-redaction-packet.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-truth-redaction-packet.ts"
      ],
      "referencedPackageScript": "check:admin-truth-redaction-packet",
      "referencedTest": "tests/unit/admin-truth-redaction-packet.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "c00b6d90c112eb289ec1b354f92fdbbc9a793ab9",
      "proofStatus": "formal_evidence_required",
      "contradictionFound": false,
      "exactNextAction": "Attach formal operator/provider/runtime/admin evidence; do not clear this by source validation."
    },
    {
      "claimId": "admin-truth-sample-evidence:pass:17",
      "sourceArtifact": "agent/state/admin-truth-sample-evidence.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-admin-truth-sample-evidence.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-truth-sample-evidence.ts"
      ],
      "referencedPackageScript": "check:admin-truth-sample-evidence",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "4958214e1e6ed79d3be73853dc7ba896524068eb",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-truth-sample-evidence:current:18",
      "sourceArtifact": "agent/state/admin-truth-sample-evidence.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-admin-truth-sample-evidence.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-truth-sample-evidence.ts"
      ],
      "referencedPackageScript": "check:admin-truth-sample-evidence",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "4958214e1e6ed79d3be73853dc7ba896524068eb",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-truth-source-sample:pass:19",
      "sourceArtifact": "agent/state/admin-truth-source-sample.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-admin-truth-source-sample.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-truth-source-sample.ts"
      ],
      "referencedPackageScript": "check:admin-truth-source-sample",
      "referencedTest": "tests/unit/admin-truth-source-sample.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d1f8e2fb4435ad131c8fc7cc85debe027a31346a",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-truth-source-sample:current:20",
      "sourceArtifact": "agent/state/admin-truth-source-sample.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-admin-truth-source-sample.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-truth-source-sample.ts"
      ],
      "referencedPackageScript": "check:admin-truth-source-sample",
      "referencedTest": "tests/unit/admin-truth-source-sample.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d1f8e2fb4435ad131c8fc7cc85debe027a31346a",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "advanced-telemetry-parity-ui-cleanup:current:21",
      "sourceArtifact": "agent/state/advanced-telemetry-parity-ui-cleanup.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-advanced-telemetry-parity-ui-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-advanced-telemetry-parity-ui-cleanup.ts"
      ],
      "referencedPackageScript": "check:advanced-telemetry-parity-ui-cleanup",
      "referencedTest": "tests/unit/advanced-telemetry-parity-ui-cleanup.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "9dc79a00f40df751841c8d8f10d98de636336397",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-critic-p1-triage:pass:22",
      "sourceArtifact": "agent/state/ai-critic-p1-triage.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-ai-critic-p1-triage.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-critic-p1-triage.ts"
      ],
      "referencedPackageScript": "check:ai-critic-p1-triage",
      "referencedTest": "tests/unit/ai-critic-p1-triage.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "bbd8d8c7da74cf60bb978373242a76e5e0f305d7",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-critic-p1-triage:ready:23",
      "sourceArtifact": "agent/state/ai-critic-p1-triage.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-ai-critic-p1-triage.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-critic-p1-triage.ts"
      ],
      "referencedPackageScript": "check:ai-critic-p1-triage",
      "referencedTest": "tests/unit/ai-critic-p1-triage.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "bbd8d8c7da74cf60bb978373242a76e5e0f305d7",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-critic-p1-triage:complete:24",
      "sourceArtifact": "agent/state/ai-critic-p1-triage.generated.json",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": "scripts/agent/validate-ai-critic-p1-triage.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-critic-p1-triage.ts"
      ],
      "referencedPackageScript": "check:ai-critic-p1-triage",
      "referencedTest": "tests/unit/ai-critic-p1-triage.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "bbd8d8c7da74cf60bb978373242a76e5e0f305d7",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-critic-p1-triage:current:25",
      "sourceArtifact": "agent/state/ai-critic-p1-triage.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-ai-critic-p1-triage.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-critic-p1-triage.ts"
      ],
      "referencedPackageScript": "check:ai-critic-p1-triage",
      "referencedTest": "tests/unit/ai-critic-p1-triage.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "bbd8d8c7da74cf60bb978373242a76e5e0f305d7",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-debug-critic:pass:26",
      "sourceArtifact": "agent/state/ai-debug-critic.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-ai-debug-critic.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-debug-critic.ts"
      ],
      "referencedPackageScript": "check:ai-debug-critic",
      "referencedTest": "tests/unit/ai-debug-critic.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-debug-critic:current:27",
      "sourceArtifact": "agent/state/ai-debug-critic.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-ai-debug-critic.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-debug-critic.ts"
      ],
      "referencedPackageScript": "check:ai-debug-critic",
      "referencedTest": "tests/unit/ai-debug-critic.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-debug-planner:pass:28",
      "sourceArtifact": "agent/state/ai-debug-planner.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-ai-debug-planner.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-debug-planner.ts"
      ],
      "referencedPackageScript": "check:ai-debug-planner",
      "referencedTest": "tests/unit/ai-debug-planner.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-debug-planner:ready:29",
      "sourceArtifact": "agent/state/ai-debug-planner.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-ai-debug-planner.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-debug-planner.ts"
      ],
      "referencedPackageScript": "check:ai-debug-planner",
      "referencedTest": "tests/unit/ai-debug-planner.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "algorithmic-evidence-policy:ready:30",
      "sourceArtifact": "agent/state/algorithmic-evidence-policy.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-algorithmic-evidence-policy.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-algorithmic-evidence-policy.ts"
      ],
      "referencedPackageScript": "check:algorithmic-evidence-policy",
      "referencedTest": "tests/unit/algorithmic-evidence-policy.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "e7d4eb198c8b9f728589fe48b41345f295a854d1",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "algorithmic-evidence-policy:current:31",
      "sourceArtifact": "agent/state/algorithmic-evidence-policy.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-algorithmic-evidence-policy.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-algorithmic-evidence-policy.ts"
      ],
      "referencedPackageScript": "check:algorithmic-evidence-policy",
      "referencedTest": "tests/unit/algorithmic-evidence-policy.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "e7d4eb198c8b9f728589fe48b41345f295a854d1",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-cost-hot-path-reduction:pass:32",
      "sourceArtifact": "agent/state/analytics-cost-hot-path-reduction.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-analytics-cost-hot-path-reduction.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-cost-hot-path-reduction.ts"
      ],
      "referencedPackageScript": "check:analytics-cost-hot-path-reduction",
      "referencedTest": "tests/unit/analytics-cost-hot-path-reduction.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d8f818a75f5b7e195937878e15058d63a4cc40fd",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-cost-hot-path-reduction:current:33",
      "sourceArtifact": "agent/state/analytics-cost-hot-path-reduction.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-analytics-cost-hot-path-reduction.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-cost-hot-path-reduction.ts"
      ],
      "referencedPackageScript": "check:analytics-cost-hot-path-reduction",
      "referencedTest": "tests/unit/analytics-cost-hot-path-reduction.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d8f818a75f5b7e195937878e15058d63a4cc40fd",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-cost-runtime-inventory:pass:34",
      "sourceArtifact": "agent/state/analytics-cost-runtime-inventory.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-analytics-cost-runtime-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-cost-runtime-inventory.ts"
      ],
      "referencedPackageScript": "check:analytics-cost-runtime-inventory",
      "referencedTest": "tests/unit/analytics-cost-runtime-inventory.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "b375acf9361858bfb97d9e3fac8877bb230a596c",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-cost-runtime-inventory:ready:35",
      "sourceArtifact": "agent/state/analytics-cost-runtime-inventory.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-analytics-cost-runtime-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-cost-runtime-inventory.ts"
      ],
      "referencedPackageScript": "check:analytics-cost-runtime-inventory",
      "referencedTest": "tests/unit/analytics-cost-runtime-inventory.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "b375acf9361858bfb97d9e3fac8877bb230a596c",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-ecosystem-parity:pass:36",
      "sourceArtifact": "agent/state/analytics-ecosystem-parity.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": "tests/unit/analytics-ecosystem-parity.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-ecosystem-parity:complete:37",
      "sourceArtifact": "agent/state/analytics-ecosystem-parity.generated.json",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": "tests/unit/analytics-ecosystem-parity.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-hot-path-cost-reduction:pass:38",
      "sourceArtifact": "agent/state/analytics-hot-path-cost-reduction.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-analytics-hot-path-cost-reduction.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-hot-path-cost-reduction.ts"
      ],
      "referencedPackageScript": "check:analytics-hot-path-cost-reduction",
      "referencedTest": "tests/unit/analytics-hot-path-cost-reduction.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "b83c1225ffd93a16f6aecdd9b0081695613e32da",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-hot-path-cost-reduction:current:39",
      "sourceArtifact": "agent/state/analytics-hot-path-cost-reduction.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-analytics-hot-path-cost-reduction.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-hot-path-cost-reduction.ts"
      ],
      "referencedPackageScript": "check:analytics-hot-path-cost-reduction",
      "referencedTest": "tests/unit/analytics-hot-path-cost-reduction.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "b83c1225ffd93a16f6aecdd9b0081695613e32da",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-identity-transfer-inventory:pass:40",
      "sourceArtifact": "agent/state/analytics-identity-transfer-inventory.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-analytics-identity-transfer-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-identity-transfer-inventory.ts"
      ],
      "referencedPackageScript": "check:analytics-identity-transfer-inventory",
      "referencedTest": "tests/unit/analytics-identity-transfer-inventory.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "5804de2bee6bb7ee37b6764af26094c391d03abf",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-identity-transfer-inventory:current:41",
      "sourceArtifact": "agent/state/analytics-identity-transfer-inventory.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-analytics-identity-transfer-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-identity-transfer-inventory.ts"
      ],
      "referencedPackageScript": "check:analytics-identity-transfer-inventory",
      "referencedTest": "tests/unit/analytics-identity-transfer-inventory.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "5804de2bee6bb7ee37b6764af26094c391d03abf",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-ingest-firestore-closure:pass:42",
      "sourceArtifact": "agent/state/analytics-ingest-firestore-closure.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-analytics-ingest-firestore-closure.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-ingest-firestore-closure.ts"
      ],
      "referencedPackageScript": "check:analytics-ingest-firestore-closure",
      "referencedTest": "tests/unit/analytics-ingest-firestore-closure.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "13dc614b575932b3bc589acabe8cccb675a2f614",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-ingest-identified-repair:complete:43",
      "sourceArtifact": "agent/state/analytics-ingest-identified-repair.generated.json",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": "scripts/agent/validate-analytics-ingest-identified-repair.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-ingest-identified-repair.ts"
      ],
      "referencedPackageScript": "check:analytics-ingest-identified-repair",
      "referencedTest": "tests/unit/analytics-ingest-identified-repair.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-ingest-identified-repair:current:44",
      "sourceArtifact": "agent/state/analytics-ingest-identified-repair.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-analytics-ingest-identified-repair.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-ingest-identified-repair.ts"
      ],
      "referencedPackageScript": "check:analytics-ingest-identified-repair",
      "referencedTest": "tests/unit/analytics-ingest-identified-repair.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-legacy-history-reconciliation:pass:45",
      "sourceArtifact": "agent/state/analytics-legacy-history-reconciliation.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-analytics-legacy-history-reconciliation.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-legacy-history-reconciliation.ts"
      ],
      "referencedPackageScript": "check:analytics-legacy-history-reconciliation",
      "referencedTest": "tests/unit/analytics-legacy-history-reconciliation.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "c85b7c584648f4283da9a1f6795e9b9406654406",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-legacy-history-reconciliation:current:46",
      "sourceArtifact": "agent/state/analytics-legacy-history-reconciliation.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-analytics-legacy-history-reconciliation.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-legacy-history-reconciliation.ts"
      ],
      "referencedPackageScript": "check:analytics-legacy-history-reconciliation",
      "referencedTest": "tests/unit/analytics-legacy-history-reconciliation.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "c85b7c584648f4283da9a1f6795e9b9406654406",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-legacy-recovery-reconciliation:current:47",
      "sourceArtifact": "agent/state/analytics-legacy-recovery-reconciliation.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-analytics-legacy-recovery-reconciliation.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-legacy-recovery-reconciliation.ts"
      ],
      "referencedPackageScript": "check:analytics-legacy-recovery-reconciliation",
      "referencedTest": "tests/unit/analytics-legacy-recovery-reconciliation.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d14d5d10899b0784d0743319a45c83854443a49a",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-rewire-phase-one:current:48",
      "sourceArtifact": "agent/state/analytics-rewire-phase-one.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-analytics-rewire-phase-one.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-rewire-phase-one.ts"
      ],
      "referencedPackageScript": "check:analytics-rewire-phase-one",
      "referencedTest": "tests/unit/analytics-rewire-phase-one.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "142bba579d7a2f0b73610b0b5f0498a26e19b836",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-semantics-final-lock:ready:49",
      "sourceArtifact": "agent/state/analytics-semantics-final-lock.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-analytics-semantics-final-lock.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-semantics-final-lock.ts"
      ],
      "referencedPackageScript": "check:analytics-semantics-final-lock",
      "referencedTest": "tests/unit/analytics-semantics-final-lock.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "2e91fea3b74d8c5e1122a1fe7acb475510e9019a",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-semantics-final-lock:betaExitReady:50",
      "sourceArtifact": "agent/state/analytics-semantics-final-lock.generated.json",
      "claimText": "betaExitReady",
      "claimedStatus": "betaExitReady",
      "referencedValidator": "scripts/agent/validate-analytics-semantics-final-lock.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-semantics-final-lock.ts"
      ],
      "referencedPackageScript": "check:analytics-semantics-final-lock",
      "referencedTest": "tests/unit/analytics-semantics-final-lock.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "2e91fea3b74d8c5e1122a1fe7acb475510e9019a",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-validation-semantics:ready:51",
      "sourceArtifact": "agent/state/analytics-validation-semantics.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-analytics-validation-semantics.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-validation-semantics.ts"
      ],
      "referencedPackageScript": "check:analytics-validation-semantics",
      "referencedTest": "tests/unit/analytics-validation-semantics.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "5c7d0dbd153160989cd96bca6702a87b5d00eeb9",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "auth-persistence-stability:current:52",
      "sourceArtifact": "agent/state/auth-persistence-stability.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-auth-persistence-stability.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-auth-persistence-stability.ts"
      ],
      "referencedPackageScript": "check:auth-persistence-stability",
      "referencedTest": "tests/unit/auth-persistence-stability.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "309d6b03",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "auth-provider-conflict-resolution:complete:53",
      "sourceArtifact": "agent/state/auth-provider-conflict-resolution.generated.json",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": "scripts/agent/validate-auth-provider-conflict-resolution.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-auth-provider-conflict-resolution.ts"
      ],
      "referencedPackageScript": "check:auth-provider-conflict-resolution",
      "referencedTest": "tests/unit/auth-provider-conflict-resolution.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "309d6b03",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "auth-provider-conflict-resolution:current:54",
      "sourceArtifact": "agent/state/auth-provider-conflict-resolution.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-auth-provider-conflict-resolution.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-auth-provider-conflict-resolution.ts"
      ],
      "referencedPackageScript": "check:auth-provider-conflict-resolution",
      "referencedTest": "tests/unit/auth-provider-conflict-resolution.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "309d6b03",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "auth-readiness-lock:pass:55",
      "sourceArtifact": "agent/state/auth-readiness-lock.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-auth-readiness-lock.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-auth-readiness-lock.ts"
      ],
      "referencedPackageScript": "check:auth-readiness-lock",
      "referencedTest": "tests/unit/auth-readiness-lock.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "3198b27d8499d675aa8e3ee98fe4e3368f2c77e0",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "auth-readiness-lock:locked:56",
      "sourceArtifact": "agent/state/auth-readiness-lock.generated.json",
      "claimText": "locked",
      "claimedStatus": "locked",
      "referencedValidator": "scripts/agent/validate-auth-readiness-lock.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-auth-readiness-lock.ts"
      ],
      "referencedPackageScript": "check:auth-readiness-lock",
      "referencedTest": "tests/unit/auth-readiness-lock.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "3198b27d8499d675aa8e3ee98fe4e3368f2c77e0",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "auth-readiness-lock:complete:57",
      "sourceArtifact": "agent/state/auth-readiness-lock.generated.json",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": "scripts/agent/validate-auth-readiness-lock.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-auth-readiness-lock.ts"
      ],
      "referencedPackageScript": "check:auth-readiness-lock",
      "referencedTest": "tests/unit/auth-readiness-lock.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "3198b27d8499d675aa8e3ee98fe4e3368f2c77e0",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "auth-readiness-lock:current:58",
      "sourceArtifact": "agent/state/auth-readiness-lock.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-auth-readiness-lock.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-auth-readiness-lock.ts"
      ],
      "referencedPackageScript": "check:auth-readiness-lock",
      "referencedTest": "tests/unit/auth-readiness-lock.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "3198b27d8499d675aa8e3ee98fe4e3368f2c77e0",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "auth-runtime-telemetry:pass:59",
      "sourceArtifact": "agent/state/auth-runtime-telemetry.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-auth-runtime-telemetry.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-auth-runtime-telemetry.ts"
      ],
      "referencedPackageScript": "check:auth-runtime-telemetry",
      "referencedTest": "tests/unit/auth-runtime-telemetry.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "309d6b03",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "auth-runtime-telemetry:current:60",
      "sourceArtifact": "agent/state/auth-runtime-telemetry.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-auth-runtime-telemetry.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-auth-runtime-telemetry.ts"
      ],
      "referencedPackageScript": "check:auth-runtime-telemetry",
      "referencedTest": "tests/unit/auth-runtime-telemetry.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "309d6b03",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "automated-truth-reconciliation:pass:61",
      "sourceArtifact": "agent/state/automated-truth-reconciliation.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-automated-truth-reconciliation.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-automated-truth-reconciliation.ts"
      ],
      "referencedPackageScript": "check:automated-truth-reconciliation",
      "referencedTest": "tests/unit/automated-truth-reconciliation.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "proofStatus": "proven_current",
      "contradictionFound": false,
      "exactNextAction": "Keep validator, artifact, and source wiring current."
    },
    {
      "claimId": "automated-truth-reconciliation:ready:62",
      "sourceArtifact": "agent/state/automated-truth-reconciliation.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-automated-truth-reconciliation.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-automated-truth-reconciliation.ts"
      ],
      "referencedPackageScript": "check:automated-truth-reconciliation",
      "referencedTest": "tests/unit/automated-truth-reconciliation.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "proofStatus": "proven_current",
      "contradictionFound": false,
      "exactNextAction": "Keep validator, artifact, and source wiring current."
    },
    {
      "claimId": "automated-truth-reconciliation:locked:63",
      "sourceArtifact": "agent/state/automated-truth-reconciliation.generated.json",
      "claimText": "locked",
      "claimedStatus": "locked",
      "referencedValidator": "scripts/agent/validate-automated-truth-reconciliation.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-automated-truth-reconciliation.ts"
      ],
      "referencedPackageScript": "check:automated-truth-reconciliation",
      "referencedTest": "tests/unit/automated-truth-reconciliation.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "proofStatus": "proven_current",
      "contradictionFound": false,
      "exactNextAction": "Keep validator, artifact, and source wiring current."
    },
    {
      "claimId": "automated-truth-reconciliation:complete:64",
      "sourceArtifact": "agent/state/automated-truth-reconciliation.generated.json",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": "scripts/agent/validate-automated-truth-reconciliation.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-automated-truth-reconciliation.ts"
      ],
      "referencedPackageScript": "check:automated-truth-reconciliation",
      "referencedTest": "tests/unit/automated-truth-reconciliation.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "proofStatus": "proven_current",
      "contradictionFound": false,
      "exactNextAction": "Keep validator, artifact, and source wiring current."
    },
    {
      "claimId": "background-job-idempotency-audit:current:65",
      "sourceArtifact": "agent/state/background-job-idempotency-audit.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "behavior-math-status-cleanup:current:66",
      "sourceArtifact": "agent/state/behavior-math-status-cleanup.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-behavior-math-status-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-behavior-math-status-cleanup.ts"
      ],
      "referencedPackageScript": "check:behavior-math-status-cleanup",
      "referencedTest": "tests/unit/behavior-math-status-cleanup.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "4214aa6fca1f18201e8f09ed9197f38316b035c9",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "behavioral-extensibility-layer:pass:67",
      "sourceArtifact": "agent/state/behavioral-extensibility-layer.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-behavioral-extensibility-layer.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-behavioral-extensibility-layer.ts"
      ],
      "referencedPackageScript": "check:behavioral-extensibility-layer",
      "referencedTest": "tests/unit/behavioral-extensibility-layer.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "edd31cbee1e569fa059397c4782dd9f608c02fe9",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "behavioral-extensibility-layer:current:68",
      "sourceArtifact": "agent/state/behavioral-extensibility-layer.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-behavioral-extensibility-layer.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-behavioral-extensibility-layer.ts"
      ],
      "referencedPackageScript": "check:behavioral-extensibility-layer",
      "referencedTest": "tests/unit/behavioral-extensibility-layer.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "edd31cbee1e569fa059397c4782dd9f608c02fe9",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-evidence-gap-map:pass:69",
      "sourceArtifact": "agent/state/beta-evidence-gap-map.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-beta-evidence-gap-map.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-evidence-gap-map.ts"
      ],
      "referencedPackageScript": "check:beta-evidence-gap-map",
      "referencedTest": "tests/unit/beta-evidence-gap-map.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "2b2e19b60aff5bd93e0a9bde735793dad18dbe52",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-evidence-gap-map:ready:70",
      "sourceArtifact": "agent/state/beta-evidence-gap-map.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-beta-evidence-gap-map.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-evidence-gap-map.ts"
      ],
      "referencedPackageScript": "check:beta-evidence-gap-map",
      "referencedTest": "tests/unit/beta-evidence-gap-map.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "2b2e19b60aff5bd93e0a9bde735793dad18dbe52",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-evidence-gap-map:current:71",
      "sourceArtifact": "agent/state/beta-evidence-gap-map.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-beta-evidence-gap-map.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-evidence-gap-map.ts"
      ],
      "referencedPackageScript": "check:beta-evidence-gap-map",
      "referencedTest": "tests/unit/beta-evidence-gap-map.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "2b2e19b60aff5bd93e0a9bde735793dad18dbe52",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-evidence-gap-map:owner_review:72",
      "sourceArtifact": "agent/state/beta-evidence-gap-map.generated.json",
      "claimText": "owner_review",
      "claimedStatus": "owner_review",
      "referencedValidator": "scripts/agent/validate-beta-evidence-gap-map.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-evidence-gap-map.ts"
      ],
      "referencedPackageScript": "check:beta-evidence-gap-map",
      "referencedTest": "tests/unit/beta-evidence-gap-map.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "2b2e19b60aff5bd93e0a9bde735793dad18dbe52",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-evidence-lane-prep:ready:73",
      "sourceArtifact": "agent/state/beta-evidence-lane-prep.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-beta-evidence-lane-prep.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-evidence-lane-prep.ts"
      ],
      "referencedPackageScript": "check:beta-evidence-lane-prep",
      "referencedTest": "tests/unit/beta-evidence-lane-prep.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "2b2e19b60aff5bd93e0a9bde735793dad18dbe52",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-evidence-lane-prep:current:74",
      "sourceArtifact": "agent/state/beta-evidence-lane-prep.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-beta-evidence-lane-prep.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-evidence-lane-prep.ts"
      ],
      "referencedPackageScript": "check:beta-evidence-lane-prep",
      "referencedTest": "tests/unit/beta-evidence-lane-prep.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "2b2e19b60aff5bd93e0a9bde735793dad18dbe52",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-evidence-lane-prep:formal_missing:75",
      "sourceArtifact": "agent/state/beta-evidence-lane-prep.generated.json",
      "claimText": "formal_missing",
      "claimedStatus": "formal_missing",
      "referencedValidator": "scripts/agent/validate-beta-evidence-lane-prep.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-evidence-lane-prep.ts"
      ],
      "referencedPackageScript": "check:beta-evidence-lane-prep",
      "referencedTest": "tests/unit/beta-evidence-lane-prep.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "2b2e19b60aff5bd93e0a9bde735793dad18dbe52",
      "proofStatus": "formal_evidence_required",
      "contradictionFound": false,
      "exactNextAction": "Attach formal operator/provider/runtime/admin evidence; do not clear this by source validation."
    },
    {
      "claimId": "beta-evidence-lane-prep:betaExitReady:76",
      "sourceArtifact": "agent/state/beta-evidence-lane-prep.generated.json",
      "claimText": "betaExitReady",
      "claimedStatus": "betaExitReady",
      "referencedValidator": "scripts/agent/validate-beta-evidence-lane-prep.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-evidence-lane-prep.ts"
      ],
      "referencedPackageScript": "check:beta-evidence-lane-prep",
      "referencedTest": "tests/unit/beta-evidence-lane-prep.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "2b2e19b60aff5bd93e0a9bde735793dad18dbe52",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-freshness-language:pass:77",
      "sourceArtifact": "agent/state/beta-freshness-language.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-beta-freshness-language.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-freshness-language.ts"
      ],
      "referencedPackageScript": "check:beta-freshness-language",
      "referencedTest": "tests/unit/beta-freshness-language.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "2b2e19b60aff5bd93e0a9bde735793dad18dbe52",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-freshness-language:current:78",
      "sourceArtifact": "agent/state/beta-freshness-language.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-beta-freshness-language.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-freshness-language.ts"
      ],
      "referencedPackageScript": "check:beta-freshness-language",
      "referencedTest": "tests/unit/beta-freshness-language.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "2b2e19b60aff5bd93e0a9bde735793dad18dbe52",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-health-algorithm-v2:pass:79",
      "sourceArtifact": "agent/state/beta-health-algorithm-v2.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-beta-health-algorithm-v2.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-health-algorithm-v2.ts"
      ],
      "referencedPackageScript": "check:beta-health-algorithm-v2",
      "referencedTest": "tests/unit/beta-health-algorithm-v2.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "1834e7481d4c0a87fa36f188e6a84548cc489a51",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-health-algorithm-v2:ready:80",
      "sourceArtifact": "agent/state/beta-health-algorithm-v2.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-beta-health-algorithm-v2.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-health-algorithm-v2.ts"
      ],
      "referencedPackageScript": "check:beta-health-algorithm-v2",
      "referencedTest": "tests/unit/beta-health-algorithm-v2.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "1834e7481d4c0a87fa36f188e6a84548cc489a51",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-score-cleanup:pass:81",
      "sourceArtifact": "agent/state/beta-score-cleanup.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-beta-score-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-score-cleanup.ts"
      ],
      "referencedPackageScript": "check:beta-score-cleanup",
      "referencedTest": "tests/unit/beta-score-cleanup.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "70919f6be9129ce71ecc8b8f88eeafec9f866b5f",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-score-cleanup:current:82",
      "sourceArtifact": "agent/state/beta-score-cleanup.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-beta-score-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-score-cleanup.ts"
      ],
      "referencedPackageScript": "check:beta-score-cleanup",
      "referencedTest": "tests/unit/beta-score-cleanup.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "70919f6be9129ce71ecc8b8f88eeafec9f866b5f",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-score-cleanup:cost_review_required:83",
      "sourceArtifact": "agent/state/beta-score-cleanup.generated.json",
      "claimText": "cost_review_required",
      "claimedStatus": "cost_review_required",
      "referencedValidator": "scripts/agent/validate-beta-score-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-score-cleanup.ts"
      ],
      "referencedPackageScript": "check:beta-score-cleanup",
      "referencedTest": "tests/unit/beta-score-cleanup.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "70919f6be9129ce71ecc8b8f88eeafec9f866b5f",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "billing-spike-radar:pass:84",
      "sourceArtifact": "agent/state/billing-spike-radar.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "billing-spike-radar:complete:85",
      "sourceArtifact": "agent/state/billing-spike-radar.generated.json",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "blocked-refresh-queue-resolver:pass:86",
      "sourceArtifact": "agent/state/blocked-refresh-queue-resolver.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-blocked-refresh-queue-resolver.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-blocked-refresh-queue-resolver.ts"
      ],
      "referencedPackageScript": "check:blocked-refresh-queue-resolver",
      "referencedTest": "tests/unit/blocked-refresh-queue-resolver.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "f77a5c417449e51c3ec56b14fcaeef2ac546f95c",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "blocked-refresh-queue-resolver:current:87",
      "sourceArtifact": "agent/state/blocked-refresh-queue-resolver.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-blocked-refresh-queue-resolver.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-blocked-refresh-queue-resolver.ts"
      ],
      "referencedPackageScript": "check:blocked-refresh-queue-resolver",
      "referencedTest": "tests/unit/blocked-refresh-queue-resolver.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "f77a5c417449e51c3ec56b14fcaeef2ac546f95c",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "body-system-wiring-repair:pass:88",
      "sourceArtifact": "agent/state/body-system-wiring-repair.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-body-system-wiring-repair.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-body-system-wiring-repair.ts"
      ],
      "referencedPackageScript": "check:body-system-wiring-repair",
      "referencedTest": "tests/unit/body-system-wiring-repair.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "a74f489c81e605f1c9a280f28726d352fcb54dee",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "body-system-wiring-repair:ready:89",
      "sourceArtifact": "agent/state/body-system-wiring-repair.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-body-system-wiring-repair.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-body-system-wiring-repair.ts"
      ],
      "referencedPackageScript": "check:body-system-wiring-repair",
      "referencedTest": "tests/unit/body-system-wiring-repair.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "a74f489c81e605f1c9a280f28726d352fcb54dee",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "body-system-wiring-repair:current:90",
      "sourceArtifact": "agent/state/body-system-wiring-repair.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-body-system-wiring-repair.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-body-system-wiring-repair.ts"
      ],
      "referencedPackageScript": "check:body-system-wiring-repair",
      "referencedTest": "tests/unit/body-system-wiring-repair.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "a74f489c81e605f1c9a280f28726d352fcb54dee",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "bug-report-truth-source-cleanup:current:91",
      "sourceArtifact": "agent/state/bug-report-truth-source-cleanup.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-bug-report-truth-source-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-bug-report-truth-source-cleanup.ts"
      ],
      "referencedPackageScript": "check:bug-report-truth-source-cleanup",
      "referencedTest": "tests/unit/bug-report-truth-source-cleanup.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "5c7d0dbd153160989cd96bca6702a87b5d00eeb9",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "canonical-math-authority-ledger:pass:92",
      "sourceArtifact": "agent/state/canonical-math-authority-ledger.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-canonical-math-authority-ledger.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-canonical-math-authority-ledger.ts"
      ],
      "referencedPackageScript": "check:canonical-math-authority-ledger",
      "referencedTest": "tests/unit/canonical-math-authority-ledger.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d8cab39150662e8600c129d90d931b812256ab77",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "canonical-math-authority-ledger:ready:93",
      "sourceArtifact": "agent/state/canonical-math-authority-ledger.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-canonical-math-authority-ledger.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-canonical-math-authority-ledger.ts"
      ],
      "referencedPackageScript": "check:canonical-math-authority-ledger",
      "referencedTest": "tests/unit/canonical-math-authority-ledger.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d8cab39150662e8600c129d90d931b812256ab77",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "canonical-math-authority-ledger:complete:94",
      "sourceArtifact": "agent/state/canonical-math-authority-ledger.generated.json",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": "scripts/agent/validate-canonical-math-authority-ledger.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-canonical-math-authority-ledger.ts"
      ],
      "referencedPackageScript": "check:canonical-math-authority-ledger",
      "referencedTest": "tests/unit/canonical-math-authority-ledger.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d8cab39150662e8600c129d90d931b812256ab77",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "canonical-math-authority-ledger:current:95",
      "sourceArtifact": "agent/state/canonical-math-authority-ledger.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-canonical-math-authority-ledger.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-canonical-math-authority-ledger.ts"
      ],
      "referencedPackageScript": "check:canonical-math-authority-ledger",
      "referencedTest": "tests/unit/canonical-math-authority-ledger.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d8cab39150662e8600c129d90d931b812256ab77",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "canonical-math-ledger:pass:96",
      "sourceArtifact": "agent/state/canonical-math-ledger.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-canonical-math-ledger.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-canonical-math-ledger.ts"
      ],
      "referencedPackageScript": "check:canonical-math-ledger",
      "referencedTest": "tests/unit/canonical-math-ledger.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "34f63bc34ed85473191110bc6084e1dbbead4d2a",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "central-normalizer-spine:pass:97",
      "sourceArtifact": "agent/state/central-normalizer-spine.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-central-normalizer-spine.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-central-normalizer-spine.ts"
      ],
      "referencedPackageScript": "check:central-normalizer-spine",
      "referencedTest": "tests/unit/central-normalizer-spine.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "a74f489c81e605f1c9a280f28726d352fcb54dee",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "central-normalizer-spine:current:98",
      "sourceArtifact": "agent/state/central-normalizer-spine.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-central-normalizer-spine.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-central-normalizer-spine.ts"
      ],
      "referencedPackageScript": "check:central-normalizer-spine",
      "referencedTest": "tests/unit/central-normalizer-spine.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "a74f489c81e605f1c9a280f28726d352fcb54dee",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chat-composer-modal-lift:pass:99",
      "sourceArtifact": "agent/state/chat-composer-modal-lift.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-chat-composer-modal-lift.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-chat-composer-modal-lift.ts"
      ],
      "referencedPackageScript": "check:chat-composer-modal-lift",
      "referencedTest": "tests/unit/chat-composer-modal-lift.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "58929a769685124b73004b07f1795ec1dd0dd45f",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chat-functionality-score-lock:pass:100",
      "sourceArtifact": "agent/state/chat-functionality-score-lock.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-chat-functionality-score-lock.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-chat-functionality-score-lock.ts"
      ],
      "referencedPackageScript": "check:chat-functionality-score-lock",
      "referencedTest": "tests/unit/chat-functionality-score-lock.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d02b8b2da859d47d880182fe2169db1ad6a40ad6",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chat-gating-moderation:ready:101",
      "sourceArtifact": "agent/state/chat-gating-moderation.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-chat-gating-moderation.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-chat-gating-moderation.ts"
      ],
      "referencedPackageScript": "check:chat-gating-moderation",
      "referencedTest": "tests/unit/chat-gating-moderation.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d02b8b2da859d47d880182fe2169db1ad6a40ad6",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chat-presence-typing:pass:102",
      "sourceArtifact": "agent/state/chat-presence-typing.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-chat-presence-typing.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-chat-presence-typing.ts"
      ],
      "referencedPackageScript": "check:chat-presence-typing",
      "referencedTest": "tests/unit/chat-presence-typing.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "7a7ad97d75695ba776d2fe2b5f2e82dfdfd8e482",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chat-presence-typing:current:103",
      "sourceArtifact": "agent/state/chat-presence-typing.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-chat-presence-typing.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-chat-presence-typing.ts"
      ],
      "referencedPackageScript": "check:chat-presence-typing",
      "referencedTest": "tests/unit/chat-presence-typing.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "7a7ad97d75695ba776d2fe2b5f2e82dfdfd8e482",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chat-realtime-cost-control:ready:104",
      "sourceArtifact": "agent/state/chat-realtime-cost-control.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-chat-realtime-cost-control.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-chat-realtime-cost-control.ts"
      ],
      "referencedPackageScript": "check:chat-realtime-cost-control",
      "referencedTest": "tests/unit/chat-realtime-cost-control.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "7a7ad97d75695ba776d2fe2b5f2e82dfdfd8e482",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chat-realtime-cost-control:current:105",
      "sourceArtifact": "agent/state/chat-realtime-cost-control.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-chat-realtime-cost-control.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-chat-realtime-cost-control.ts"
      ],
      "referencedPackageScript": "check:chat-realtime-cost-control",
      "referencedTest": "tests/unit/chat-realtime-cost-control.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "7a7ad97d75695ba776d2fe2b5f2e82dfdfd8e482",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chat-realtime-cost-control:source_ready:106",
      "sourceArtifact": "agent/state/chat-realtime-cost-control.generated.json",
      "claimText": "source_ready",
      "claimedStatus": "source_ready",
      "referencedValidator": "scripts/agent/validate-chat-realtime-cost-control.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-chat-realtime-cost-control.ts"
      ],
      "referencedPackageScript": "check:chat-realtime-cost-control",
      "referencedTest": "tests/unit/chat-realtime-cost-control.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "7a7ad97d75695ba776d2fe2b5f2e82dfdfd8e482",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chat-route-cohort-runtime:current:107",
      "sourceArtifact": "agent/state/chat-route-cohort-runtime.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-chat-route-cohort-runtime.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-chat-route-cohort-runtime.ts"
      ],
      "referencedPackageScript": "check:chat-route-cohort-runtime",
      "referencedTest": "tests/unit/chat-route-cohort-runtime.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "claim-truth-audit:pass:108",
      "sourceArtifact": "agent/state/claim-truth-audit.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-claim-truth-audit.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-claim-truth-audit.ts"
      ],
      "referencedPackageScript": "check:claim-truth-audit",
      "referencedTest": "tests/unit/claim-truth-audit.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "proofStatus": "proven_current",
      "contradictionFound": false,
      "exactNextAction": "Keep validator, artifact, and source wiring current."
    },
    {
      "claimId": "claim-truth-audit:ready:109",
      "sourceArtifact": "agent/state/claim-truth-audit.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-claim-truth-audit.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-claim-truth-audit.ts"
      ],
      "referencedPackageScript": "check:claim-truth-audit",
      "referencedTest": "tests/unit/claim-truth-audit.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "proofStatus": "proven_current",
      "contradictionFound": false,
      "exactNextAction": "Keep validator, artifact, and source wiring current."
    },
    {
      "claimId": "claim-truth-audit:locked:110",
      "sourceArtifact": "agent/state/claim-truth-audit.generated.json",
      "claimText": "locked",
      "claimedStatus": "locked",
      "referencedValidator": "scripts/agent/validate-claim-truth-audit.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-claim-truth-audit.ts"
      ],
      "referencedPackageScript": "check:claim-truth-audit",
      "referencedTest": "tests/unit/claim-truth-audit.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "proofStatus": "proven_current",
      "contradictionFound": false,
      "exactNextAction": "Keep validator, artifact, and source wiring current."
    },
    {
      "claimId": "claim-truth-audit:complete:111",
      "sourceArtifact": "agent/state/claim-truth-audit.generated.json",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": "scripts/agent/validate-claim-truth-audit.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-claim-truth-audit.ts"
      ],
      "referencedPackageScript": "check:claim-truth-audit",
      "referencedTest": "tests/unit/claim-truth-audit.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "proofStatus": "proven_current",
      "contradictionFound": false,
      "exactNextAction": "Keep validator, artifact, and source wiring current."
    },
    {
      "claimId": "client-loading-speed:pass:112",
      "sourceArtifact": "agent/state/client-loading-speed.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-client-loading-speed.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-client-loading-speed.ts"
      ],
      "referencedPackageScript": "check:client-loading-speed",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cloud-sql-gemini-cost-guards:pass:113",
      "sourceArtifact": "agent/state/cloud-sql-gemini-cost-guards.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-cloud-sql-gemini-cost-guards.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-cloud-sql-gemini-cost-guards.ts"
      ],
      "referencedPackageScript": "check:cloud-sql-gemini-cost-guards",
      "referencedTest": "tests/unit/cloud-sql-gemini-cost-guards.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "8a062a92bdd8a0f6a2d39e32bc6033498cda5d9a",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cloudrun-sql-bigquery-guardrails:pass:114",
      "sourceArtifact": "agent/state/cloudrun-sql-bigquery-guardrails.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "code-organization-score:locked:115",
      "sourceArtifact": "agent/state/code-organization-score.generated.json",
      "claimText": "locked",
      "claimedStatus": "locked",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "code-organization-score:current:116",
      "sourceArtifact": "agent/state/code-organization-score.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "codebase-hardening:locked:117",
      "sourceArtifact": "agent/state/codebase-hardening.generated.json",
      "claimText": "locked",
      "claimedStatus": "locked",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "codebase-hardening:complete:118",
      "sourceArtifact": "agent/state/codebase-hardening.generated.json",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "codebase-hardening:current:119",
      "sourceArtifact": "agent/state/codebase-hardening.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "codebase-junk-cleanup:pass:120",
      "sourceArtifact": "agent/state/codebase-junk-cleanup.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-codebase-junk-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-codebase-junk-cleanup.ts"
      ],
      "referencedPackageScript": "check:codebase-junk-cleanup",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "codebase-junk-cleanup:locked:121",
      "sourceArtifact": "agent/state/codebase-junk-cleanup.generated.json",
      "claimText": "locked",
      "claimedStatus": "locked",
      "referencedValidator": "scripts/agent/validate-codebase-junk-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-codebase-junk-cleanup.ts"
      ],
      "referencedPackageScript": "check:codebase-junk-cleanup",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "codebase-junk-cleanup:complete:122",
      "sourceArtifact": "agent/state/codebase-junk-cleanup.generated.json",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": "scripts/agent/validate-codebase-junk-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-codebase-junk-cleanup.ts"
      ],
      "referencedPackageScript": "check:codebase-junk-cleanup",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "codebase-organization-hardening:pass:123",
      "sourceArtifact": "agent/state/codebase-organization-hardening.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-codebase-organization-hardening.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-codebase-organization-hardening.ts"
      ],
      "referencedPackageScript": "check:codebase-organization-hardening",
      "referencedTest": "tests/unit/codebase-organization-hardening.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "codebase-organization-hardening:current:124",
      "sourceArtifact": "agent/state/codebase-organization-hardening.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-codebase-organization-hardening.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-codebase-organization-hardening.ts"
      ],
      "referencedPackageScript": "check:codebase-organization-hardening",
      "referencedTest": "tests/unit/codebase-organization-hardening.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "codex-execution-guardrails:pass:125",
      "sourceArtifact": "agent/state/codex-execution-guardrails.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "commerce-parity-validator-semantics:pass:126",
      "sourceArtifact": "agent/state/commerce-parity-validator-semantics.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-commerce-parity-validator-semantics.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-commerce-parity-validator-semantics.ts"
      ],
      "referencedPackageScript": "check:commerce-parity-validator-semantics",
      "referencedTest": "tests/unit/commerce-parity-validator-semantics.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "commerce-rollup-reconciliation:pass:127",
      "sourceArtifact": "agent/state/commerce-rollup-reconciliation.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-commerce-rollup-reconciliation.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-commerce-rollup-reconciliation.ts"
      ],
      "referencedPackageScript": "check:commerce-rollup-reconciliation",
      "referencedTest": "tests/unit/commerce-rollup-reconciliation.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "complete-dependency-inventory:pass:128",
      "sourceArtifact": "agent/state/complete-dependency-inventory.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-complete-dependency-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-complete-dependency-inventory.ts"
      ],
      "referencedPackageScript": "check:complete-dependency-inventory",
      "referencedTest": "tests/unit/complete-dependency-inventory.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "complete-dependency-inventory:complete:129",
      "sourceArtifact": "agent/state/complete-dependency-inventory.generated.json",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": "scripts/agent/validate-complete-dependency-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-complete-dependency-inventory.ts"
      ],
      "referencedPackageScript": "check:complete-dependency-inventory",
      "referencedTest": "tests/unit/complete-dependency-inventory.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "complete-dependency-inventory:current:130",
      "sourceArtifact": "agent/state/complete-dependency-inventory.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-complete-dependency-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-complete-dependency-inventory.ts"
      ],
      "referencedPackageScript": "check:complete-dependency-inventory",
      "referencedTest": "tests/unit/complete-dependency-inventory.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "config-runtime-sample-status-classifier:current:131",
      "sourceArtifact": "agent/state/config-runtime-sample-status-classifier.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-config-runtime-sample-status-classifier.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-config-runtime-sample-status-classifier.ts"
      ],
      "referencedPackageScript": "check:config-runtime-sample-status-classifier",
      "referencedTest": "tests/unit/config-runtime-sample-status-classifier.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d02b8b2da859d47d880182fe2169db1ad6a40ad6",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "consent-tracking-contract:pass:132",
      "sourceArtifact": "agent/state/consent-tracking-contract.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-consent-tracking-contract.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-consent-tracking-contract.ts"
      ],
      "referencedPackageScript": "check:consent-tracking-contract",
      "referencedTest": "tests/unit/consent-tracking-contract.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "edd31cbee1e569fa059397c4782dd9f608c02fe9",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "consent-tracking-mode-cleanup:source_ready:133",
      "sourceArtifact": "agent/state/consent-tracking-mode-cleanup.generated.json",
      "claimText": "source_ready",
      "claimedStatus": "source_ready",
      "referencedValidator": "scripts/agent/validate-consent-tracking-mode-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-consent-tracking-mode-cleanup.ts"
      ],
      "referencedPackageScript": "check:consent-tracking-mode-cleanup",
      "referencedTest": "tests/unit/consent-tracking-mode-cleanup.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "4214aa6fca1f18201e8f09ed9197f38316b035c9",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "content-media-pipeline-audit:current:134",
      "sourceArtifact": "agent/state/content-media-pipeline-audit.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "content-protection-score:locked:135",
      "sourceArtifact": "agent/state/content-protection-score.generated.json",
      "claimText": "locked",
      "claimedStatus": "locked",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "control-tower-report-freshness-cleanup:current:136",
      "sourceArtifact": "agent/state/control-tower-report-freshness-cleanup.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-control-tower-report-freshness-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-control-tower-report-freshness-cleanup.ts"
      ],
      "referencedPackageScript": "check:control-tower-report-freshness-cleanup",
      "referencedTest": "tests/unit/control-tower-report-freshness-cleanup.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "5c126a7df36e39be20ab55b40ce5d14c04779fb5",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cookie-banner-settings-sync:pass:137",
      "sourceArtifact": "agent/state/cookie-banner-settings-sync.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-cookie-banner-settings-sync.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-cookie-banner-settings-sync.ts"
      ],
      "referencedPackageScript": "check:cookie-banner-settings-sync",
      "referencedTest": "tests/unit/cookie-banner-settings-sync.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "edd31cbee1e569fa059397c4782dd9f608c02fe9",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cost-4xx-reduction:pass:138",
      "sourceArtifact": "agent/state/cost-4xx-reduction.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-cost-4xx-reduction.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-cost-4xx-reduction.ts"
      ],
      "referencedPackageScript": "check:cost-4xx-reduction",
      "referencedTest": "tests/unit/cost-4xx-reduction.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "3878a581193dd171f69e3c0b63073ac738c14152",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cost-accuracy-hardening:source_ready:139",
      "sourceArtifact": "agent/state/cost-accuracy-hardening.generated.json",
      "claimText": "source_ready",
      "claimedStatus": "source_ready",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cost-data-connect-refresh:pass:140",
      "sourceArtifact": "agent/state/cost-data-connect-refresh.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-cost-data-connect-refresh.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-cost-data-connect-refresh.ts"
      ],
      "referencedPackageScript": "check:cost-data-connect-refresh",
      "referencedTest": "tests/unit/cost-data-connect-refresh.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "afdc394d07b0dd0ea93aae14ae32bc47886165d9",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cost-export-sql-parity-math:pass:141",
      "sourceArtifact": "agent/state/cost-export-sql-parity-math.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-cost-export-sql-parity-math.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-cost-export-sql-parity-math.ts"
      ],
      "referencedPackageScript": "check:cost-export-sql-parity-math",
      "referencedTest": "tests/unit/cost-export-sql-parity-math.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "14264ff8",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cost-owner-review-source-closure:pass:142",
      "sourceArtifact": "agent/state/cost-owner-review-source-closure.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-cost-owner-review-source-closure.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-cost-owner-review-source-closure.ts"
      ],
      "referencedPackageScript": "check:cost-owner-review-source-closure",
      "referencedTest": "tests/unit/cost-owner-review-source-closure.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "3878a581193dd171f69e3c0b63073ac738c14152",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cost-owner-review-source-closure:current:143",
      "sourceArtifact": "agent/state/cost-owner-review-source-closure.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-cost-owner-review-source-closure.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-cost-owner-review-source-closure.ts"
      ],
      "referencedPackageScript": "check:cost-owner-review-source-closure",
      "referencedTest": "tests/unit/cost-owner-review-source-closure.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "3878a581193dd171f69e3c0b63073ac738c14152",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cost-owner-review-source-closure:cost_review_required:144",
      "sourceArtifact": "agent/state/cost-owner-review-source-closure.generated.json",
      "claimText": "cost_review_required",
      "claimedStatus": "cost_review_required",
      "referencedValidator": "scripts/agent/validate-cost-owner-review-source-closure.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-cost-owner-review-source-closure.ts"
      ],
      "referencedPackageScript": "check:cost-owner-review-source-closure",
      "referencedTest": "tests/unit/cost-owner-review-source-closure.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "3878a581193dd171f69e3c0b63073ac738c14152",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cost-risk-exit-pass:pass:145",
      "sourceArtifact": "agent/state/cost-risk-exit-pass.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-cost-risk-exit-pass.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-cost-risk-exit-pass.ts"
      ],
      "referencedPackageScript": "check:cost-risk-exit-pass",
      "referencedTest": "tests/unit/cost-risk-exit-pass.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "a81cdb0b885f65dec63a582e4b9fe4cfdfeced39",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cost-risk-exit-pass:cost_review_required:146",
      "sourceArtifact": "agent/state/cost-risk-exit-pass.generated.json",
      "claimText": "cost_review_required",
      "claimedStatus": "cost_review_required",
      "referencedValidator": "scripts/agent/validate-cost-risk-exit-pass.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-cost-risk-exit-pass.ts"
      ],
      "referencedPackageScript": "check:cost-risk-exit-pass",
      "referencedTest": "tests/unit/cost-risk-exit-pass.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "a81cdb0b885f65dec63a582e4b9fe4cfdfeced39",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cost-risk-owner-review-closure:pass:147",
      "sourceArtifact": "agent/state/cost-risk-owner-review-closure.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-cost-risk-owner-review-closure.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-cost-risk-owner-review-closure.ts"
      ],
      "referencedPackageScript": "check:cost-risk-owner-review-closure",
      "referencedTest": "tests/unit/cost-risk-owner-review-closure.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d1f8e2fb4435ad131c8fc7cc85debe027a31346a",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cost-risk-owner-review-closure:current:148",
      "sourceArtifact": "agent/state/cost-risk-owner-review-closure.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-cost-risk-owner-review-closure.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-cost-risk-owner-review-closure.ts"
      ],
      "referencedPackageScript": "check:cost-risk-owner-review-closure",
      "referencedTest": "tests/unit/cost-risk-owner-review-closure.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d1f8e2fb4435ad131c8fc7cc85debe027a31346a",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cost-risk-owner-review-closure:cost_review_required:149",
      "sourceArtifact": "agent/state/cost-risk-owner-review-closure.generated.json",
      "claimText": "cost_review_required",
      "claimedStatus": "cost_review_required",
      "referencedValidator": "scripts/agent/validate-cost-risk-owner-review-closure.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-cost-risk-owner-review-closure.ts"
      ],
      "referencedPackageScript": "check:cost-risk-owner-review-closure",
      "referencedTest": "tests/unit/cost-risk-owner-review-closure.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d1f8e2fb4435ad131c8fc7cc85debe027a31346a",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "count-deduplication-normalization:pass:150",
      "sourceArtifact": "agent/state/count-deduplication-normalization.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-count-deduplication-normalization.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-count-deduplication-normalization.ts"
      ],
      "referencedPackageScript": "check:count-deduplication-normalization",
      "referencedTest": "tests/unit/count-deduplication-normalization.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "884fd150a5062368df5ffcfd642484a7a2360b60",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-broadcast-timeline-prep:pass:151",
      "sourceArtifact": "agent/state/creator-broadcast-timeline-prep.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-creator-broadcast-timeline-prep.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-broadcast-timeline-prep.ts"
      ],
      "referencedPackageScript": "check:creator-broadcast-timeline-prep",
      "referencedTest": "tests/unit/creator-broadcast-timeline-prep.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "080ebb115fc9d917f52b2e38108634821a2712ce",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-dashboard-error-cost-inventory:pass:152",
      "sourceArtifact": "agent/state/creator-dashboard-error-cost-inventory.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-creator-dashboard-error-cost-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-dashboard-error-cost-inventory.ts"
      ],
      "referencedPackageScript": "check:creator-dashboard-error-cost-inventory",
      "referencedTest": "tests/unit/creator-dashboard-error-cost-inventory.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d8cde44345b6f0a6f0dd8710ff063356d74a5791",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-dashboard-error-cost-inventory:owner_review:153",
      "sourceArtifact": "agent/state/creator-dashboard-error-cost-inventory.generated.json",
      "claimText": "owner_review",
      "claimedStatus": "owner_review",
      "referencedValidator": "scripts/agent/validate-creator-dashboard-error-cost-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-dashboard-error-cost-inventory.ts"
      ],
      "referencedPackageScript": "check:creator-dashboard-error-cost-inventory",
      "referencedTest": "tests/unit/creator-dashboard-error-cost-inventory.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d8cde44345b6f0a6f0dd8710ff063356d74a5791",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-dashboard-projection-lock:pass:154",
      "sourceArtifact": "agent/state/creator-dashboard-projection-lock.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-creator-dashboard-projection-lock.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-dashboard-projection-lock.ts"
      ],
      "referencedPackageScript": "check:creator-dashboard-projection-lock",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-discovery-relationship-funnel:pass:155",
      "sourceArtifact": "agent/state/creator-discovery-relationship-funnel.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-creator-discovery-relationship-funnel.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-discovery-relationship-funnel.ts"
      ],
      "referencedPackageScript": "check:creator-discovery-relationship-funnel",
      "referencedTest": "tests/unit/creator-discovery-relationship-funnel.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "e0c0b9d5d6e30325fe638cff479d766a263ef585",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-drop-status-metrics:ready:156",
      "sourceArtifact": "agent/state/creator-drop-status-metrics.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-creator-drop-status-metrics.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-drop-status-metrics.ts"
      ],
      "referencedPackageScript": "check:creator-drop-status-metrics",
      "referencedTest": "tests/unit/creator-drop-status-metrics.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "2b2e19b60aff5bd93e0a9bde735793dad18dbe52",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-experience-simplification:pass:157",
      "sourceArtifact": "agent/state/creator-experience-simplification.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-creator-experience-simplification.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-experience-simplification.ts"
      ],
      "referencedPackageScript": "check:creator-experience-simplification",
      "referencedTest": "tests/unit/creator-experience-simplification.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "e75d98523cda258032a04e11eb16e1d128bea2f9",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-fan-pass-crm-broadcast:pass:158",
      "sourceArtifact": "agent/state/creator-fan-pass-crm-broadcast.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-creator-fan-pass-crm-broadcast.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-fan-pass-crm-broadcast.ts"
      ],
      "referencedPackageScript": "check:creator-fan-pass-crm-broadcast",
      "referencedTest": "tests/unit/creator-fan-pass-crm-broadcast.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "7c61feaf8898924149f1cde5dc11278782ef8b9d",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-lane-legacy-truth-inventory:pass:159",
      "sourceArtifact": "agent/state/creator-lane-legacy-truth-inventory.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-creator-lane-legacy-truth-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-lane-legacy-truth-inventory.ts"
      ],
      "referencedPackageScript": "check:creator-lane-legacy-truth-inventory",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "afdc394d07b0dd0ea93aae14ae32bc47886165d9",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-lane-legacy-truth-inventory:complete:160",
      "sourceArtifact": "agent/state/creator-lane-legacy-truth-inventory.generated.json",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": "scripts/agent/validate-creator-lane-legacy-truth-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-lane-legacy-truth-inventory.ts"
      ],
      "referencedPackageScript": "check:creator-lane-legacy-truth-inventory",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "afdc394d07b0dd0ea93aae14ae32bc47886165d9",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-lane-legacy-truth-inventory:current:161",
      "sourceArtifact": "agent/state/creator-lane-legacy-truth-inventory.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-creator-lane-legacy-truth-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-lane-legacy-truth-inventory.ts"
      ],
      "referencedPackageScript": "check:creator-lane-legacy-truth-inventory",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "afdc394d07b0dd0ea93aae14ae32bc47886165d9",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-lane-old-logic-cleanup:complete:162",
      "sourceArtifact": "agent/state/creator-lane-old-logic-cleanup.generated.json",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-monetization-admin-debug:pass:163",
      "sourceArtifact": "agent/state/creator-monetization-admin-debug.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-creator-monetization-admin-debug.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-monetization-admin-debug.ts"
      ],
      "referencedPackageScript": "check:creator-monetization-admin-debug",
      "referencedTest": "tests/unit/creator-monetization-admin-debug.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "1e7a3bc6",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-monetization-gates-lock:pass:164",
      "sourceArtifact": "agent/state/creator-monetization-gates-lock.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-creator-monetization-gates-lock.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-monetization-gates-lock.ts"
      ],
      "referencedPackageScript": "check:creator-monetization-gates-lock",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-monetization-readiness-lock:pass:165",
      "sourceArtifact": "agent/state/creator-monetization-readiness-lock.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-creator-monetization-readiness-lock.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-monetization-readiness-lock.ts"
      ],
      "referencedPackageScript": "check:creator-monetization-readiness-lock",
      "referencedTest": "tests/unit/creator-monetization-readiness-lock.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "79ad1387",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-monetization-settings-truth:pass:166",
      "sourceArtifact": "agent/state/creator-monetization-settings-truth.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-creator-monetization-settings-truth.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-monetization-settings-truth.ts"
      ],
      "referencedPackageScript": "check:creator-monetization-settings-truth",
      "referencedTest": "tests/unit/creator-monetization-settings-truth.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "1bac904e",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-nav-role-consolidation:pass:167",
      "sourceArtifact": "agent/state/creator-nav-role-consolidation.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-creator-nav-role-consolidation.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-nav-role-consolidation.ts"
      ],
      "referencedPackageScript": "check:creator-nav-role-consolidation",
      "referencedTest": "tests/unit/creator-nav-role-consolidation.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "dc3ae97ac8edaba50669b0188a12e9f7fa4774f6",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-nav-role-consolidation:locked:168",
      "sourceArtifact": "agent/state/creator-nav-role-consolidation.generated.json",
      "claimText": "locked",
      "claimedStatus": "locked",
      "referencedValidator": "scripts/agent/validate-creator-nav-role-consolidation.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-nav-role-consolidation.ts"
      ],
      "referencedPackageScript": "check:creator-nav-role-consolidation",
      "referencedTest": "tests/unit/creator-nav-role-consolidation.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "dc3ae97ac8edaba50669b0188a12e9f7fa4774f6",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-pricing-wiring:pass:169",
      "sourceArtifact": "agent/state/creator-pricing-wiring.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-creator-pricing-wiring.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-pricing-wiring.ts"
      ],
      "referencedPackageScript": "check:creator-pricing-wiring",
      "referencedTest": "tests/unit/creator-pricing-wiring.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "42bdd44bf02066df05ab2b18dc351681fc93d1cf",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "accessibility-tap-targets:current:170",
      "sourceArtifact": "docs/agent-truth/accessibility-tap-targets.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-accessibility-tap-targets.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-accessibility-tap-targets.ts"
      ],
      "referencedPackageScript": "check:accessibility-tap-targets",
      "referencedTest": "tests/unit/accessibility-tap-targets.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "account-settings-delete-flow:pass:171",
      "sourceArtifact": "docs/agent-truth/account-settings-delete-flow.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-account-settings-delete-flow.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-account-settings-delete-flow.ts"
      ],
      "referencedPackageScript": "check:account-settings-delete-flow",
      "referencedTest": "tests/unit/account-settings-delete-flow.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "account-settings-delete-flow:current:172",
      "sourceArtifact": "docs/agent-truth/account-settings-delete-flow.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-account-settings-delete-flow.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-account-settings-delete-flow.ts"
      ],
      "referencedPackageScript": "check:account-settings-delete-flow",
      "referencedTest": "tests/unit/account-settings-delete-flow.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "account-settings-mobile-padding:pass:173",
      "sourceArtifact": "docs/agent-truth/account-settings-mobile-padding.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-account-settings-mobile-padding.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-account-settings-mobile-padding.ts"
      ],
      "referencedPackageScript": "check:account-settings-mobile-padding",
      "referencedTest": "tests/unit/account-settings-mobile-padding.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "activity-verification-engine:pass:174",
      "sourceArtifact": "docs/agent-truth/activity-verification-engine.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-activity-verification-engine.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-activity-verification-engine.ts"
      ],
      "referencedPackageScript": "check:activity-verification-engine",
      "referencedTest": "tests/unit/activity-verification-engine.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "activity-verification-engine:ready:175",
      "sourceArtifact": "docs/agent-truth/activity-verification-engine.md",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-activity-verification-engine.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-activity-verification-engine.ts"
      ],
      "referencedPackageScript": "check:activity-verification-engine",
      "referencedTest": "tests/unit/activity-verification-engine.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-ai-control-tower:current:176",
      "sourceArtifact": "docs/agent-truth/admin-ai-control-tower.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-admin-ai-control-tower.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-ai-control-tower.ts"
      ],
      "referencedPackageScript": "check:admin-ai-control-tower",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-audience-snapshot:current:177",
      "sourceArtifact": "docs/agent-truth/admin-analytics-audience-snapshot.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": "check:admin-analytics-audience-snapshot",
      "referencedTest": "tests/unit/admin-analytics-audience-snapshot.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-auth-outcome-split:current:178",
      "sourceArtifact": "docs/agent-truth/admin-analytics-auth-outcome-split.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": "check:admin-analytics-auth-outcome-split",
      "referencedTest": "tests/unit/admin-analytics-auth-outcome-split.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-auth-outcomes:current:179",
      "sourceArtifact": "docs/agent-truth/admin-analytics-auth-outcomes.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-commerce-snapshot:current:180",
      "sourceArtifact": "docs/agent-truth/admin-analytics-commerce-snapshot.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": "check:admin-analytics-commerce-snapshot",
      "referencedTest": "tests/unit/admin-analytics-commerce-snapshot.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-daily-task-pipeline:current:181",
      "sourceArtifact": "docs/agent-truth/admin-analytics-daily-task-pipeline.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": "check:admin-analytics-daily-task-pipeline",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-debug-cost-reduction:pass:182",
      "sourceArtifact": "docs/agent-truth/admin-analytics-debug-cost-reduction.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-admin-analytics-debug-cost-reduction.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-analytics-debug-cost-reduction.ts"
      ],
      "referencedPackageScript": "check:admin-analytics-debug-cost-reduction",
      "referencedTest": "tests/unit/admin-analytics-debug-cost-reduction.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-debug-cost-reduction:current:183",
      "sourceArtifact": "docs/agent-truth/admin-analytics-debug-cost-reduction.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-admin-analytics-debug-cost-reduction.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-analytics-debug-cost-reduction.ts"
      ],
      "referencedPackageScript": "check:admin-analytics-debug-cost-reduction",
      "referencedTest": "tests/unit/admin-analytics-debug-cost-reduction.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-event-mix:current:184",
      "sourceArtifact": "docs/agent-truth/admin-analytics-event-mix.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": "check:admin-analytics-event-mix",
      "referencedTest": "tests/unit/admin-analytics-event-mix.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-hot-cache:current:185",
      "sourceArtifact": "docs/agent-truth/admin-analytics-hot-cache.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-admin-analytics-hot-cache.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-analytics-hot-cache.ts"
      ],
      "referencedPackageScript": "check:admin-analytics-hot-cache",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-journey-funnel:current:186",
      "sourceArtifact": "docs/agent-truth/admin-analytics-journey-funnel.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": "check:admin-analytics-journey-funnel",
      "referencedTest": "tests/unit/admin-analytics-journey-funnel.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-launch-final:pass:187",
      "sourceArtifact": "docs/agent-truth/admin-analytics-launch-final.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-launch-final:current:188",
      "sourceArtifact": "docs/agent-truth/admin-analytics-launch-final.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-monolith-cleanup:current:189",
      "sourceArtifact": "docs/agent-truth/admin-analytics-monolith-cleanup.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-admin-analytics-monolith-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-analytics-monolith-cleanup.ts"
      ],
      "referencedPackageScript": "check:admin-analytics-monolith-cleanup",
      "referencedTest": "tests/unit/admin-analytics-monolith-cleanup.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-onboarding-performance:current:190",
      "sourceArtifact": "docs/agent-truth/admin-analytics-onboarding-performance.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": "check:admin-analytics-onboarding-performance",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-onboarding-velocity:pass:191",
      "sourceArtifact": "docs/agent-truth/admin-analytics-onboarding-velocity.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": "check:admin-analytics-onboarding-velocity",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-onboarding-velocity:current:192",
      "sourceArtifact": "docs/agent-truth/admin-analytics-onboarding-velocity.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": "check:admin-analytics-onboarding-velocity",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-overview:ready:193",
      "sourceArtifact": "docs/agent-truth/admin-analytics-overview.md",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": "check:admin-analytics-overview",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-overview:complete:194",
      "sourceArtifact": "docs/agent-truth/admin-analytics-overview.md",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": "check:admin-analytics-overview",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-overview:current:195",
      "sourceArtifact": "docs/agent-truth/admin-analytics-overview.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": "check:admin-analytics-overview",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-realtime-to-hot-cache-audit:pass:196",
      "sourceArtifact": "docs/agent-truth/admin-analytics-realtime-to-hot-cache-audit.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-source-hierarchy:pass:197",
      "sourceArtifact": "docs/agent-truth/admin-analytics-source-hierarchy.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-admin-analytics-source-hierarchy.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-analytics-source-hierarchy.ts"
      ],
      "referencedPackageScript": "check:admin-analytics-source-hierarchy",
      "referencedTest": "tests/unit/admin-analytics-source-hierarchy.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-truth:current:198",
      "sourceArtifact": "docs/agent-truth/admin-analytics-truth.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": "tests/unit/admin-analytics-truth.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-cms-drop-workflow:locked:199",
      "sourceArtifact": "docs/agent-truth/admin-cms-drop-workflow.md",
      "claimText": "locked",
      "claimedStatus": "locked",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-cms-drop-workflow:complete:200",
      "sourceArtifact": "docs/agent-truth/admin-cms-drop-workflow.md",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-cms-drop-workflow:current:201",
      "sourceArtifact": "docs/agent-truth/admin-cms-drop-workflow.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-creator-account-controls:pass:202",
      "sourceArtifact": "docs/agent-truth/admin-creator-account-controls.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-admin-creator-account-controls.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-creator-account-controls.ts"
      ],
      "referencedPackageScript": "check:admin-creator-account-controls",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-creator-account-controls:current:203",
      "sourceArtifact": "docs/agent-truth/admin-creator-account-controls.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-admin-creator-account-controls.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-creator-account-controls.ts"
      ],
      "referencedPackageScript": "check:admin-creator-account-controls",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-data-validation:pass:204",
      "sourceArtifact": "docs/agent-truth/admin-data-validation.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": "tests/unit/admin-data-validation.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-data-validation:current:205",
      "sourceArtifact": "docs/agent-truth/admin-data-validation.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": "tests/unit/admin-data-validation.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-debug-control-tower:pass:206",
      "sourceArtifact": "docs/agent-truth/admin-debug-control-tower.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-admin-debug-control-tower.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-debug-control-tower.ts"
      ],
      "referencedPackageScript": "check:admin-debug-control-tower",
      "referencedTest": "tests/unit/admin-debug-control-tower.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-debug-control-tower:current:207",
      "sourceArtifact": "docs/agent-truth/admin-debug-control-tower.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-admin-debug-control-tower.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-debug-control-tower.ts"
      ],
      "referencedPackageScript": "check:admin-debug-control-tower",
      "referencedTest": "tests/unit/admin-debug-control-tower.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-recent-transactions:complete:208",
      "sourceArtifact": "docs/agent-truth/admin-recent-transactions.md",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-recent-transactions:current:209",
      "sourceArtifact": "docs/agent-truth/admin-recent-transactions.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-revenue-top-drops:current:210",
      "sourceArtifact": "docs/agent-truth/admin-revenue-top-drops.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-revenue-trends:current:211",
      "sourceArtifact": "docs/agent-truth/admin-revenue-trends.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-roster-decision-queue:ready:212",
      "sourceArtifact": "docs/agent-truth/admin-roster-decision-queue.md",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-admin-roster-decision-queue.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-roster-decision-queue.ts"
      ],
      "referencedPackageScript": "check:admin-roster-decision-queue",
      "referencedTest": "tests/unit/admin-roster-decision-queue.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-roster-decision-queue:complete:213",
      "sourceArtifact": "docs/agent-truth/admin-roster-decision-queue.md",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": "scripts/agent/validate-admin-roster-decision-queue.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-roster-decision-queue.ts"
      ],
      "referencedPackageScript": "check:admin-roster-decision-queue",
      "referencedTest": "tests/unit/admin-roster-decision-queue.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-roster-decision-queue:current:214",
      "sourceArtifact": "docs/agent-truth/admin-roster-decision-queue.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-admin-roster-decision-queue.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-roster-decision-queue.ts"
      ],
      "referencedPackageScript": "check:admin-roster-decision-queue",
      "referencedTest": "tests/unit/admin-roster-decision-queue.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-shell-spacing:current:215",
      "sourceArtifact": "docs/agent-truth/admin-shell-spacing.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": "check:admin-shell-spacing",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-truth-redaction-packet:pass:216",
      "sourceArtifact": "docs/agent-truth/admin-truth-redaction-packet.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-admin-truth-redaction-packet.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-truth-redaction-packet.ts"
      ],
      "referencedPackageScript": "check:admin-truth-redaction-packet",
      "referencedTest": "tests/unit/admin-truth-redaction-packet.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-truth-redaction-packet:current:217",
      "sourceArtifact": "docs/agent-truth/admin-truth-redaction-packet.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-admin-truth-redaction-packet.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-truth-redaction-packet.ts"
      ],
      "referencedPackageScript": "check:admin-truth-redaction-packet",
      "referencedTest": "tests/unit/admin-truth-redaction-packet.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-truth-redaction-packet:formal_missing:218",
      "sourceArtifact": "docs/agent-truth/admin-truth-redaction-packet.md",
      "claimText": "formal_missing",
      "claimedStatus": "formal_missing",
      "referencedValidator": "scripts/agent/validate-admin-truth-redaction-packet.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-truth-redaction-packet.ts"
      ],
      "referencedPackageScript": "check:admin-truth-redaction-packet",
      "referencedTest": "tests/unit/admin-truth-redaction-packet.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "formal_evidence_required",
      "contradictionFound": false,
      "exactNextAction": "Attach formal operator/provider/runtime/admin evidence; do not clear this by source validation."
    },
    {
      "claimId": "admin-truth-sample-evidence:pass:219",
      "sourceArtifact": "docs/agent-truth/admin-truth-sample-evidence.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-admin-truth-sample-evidence.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-truth-sample-evidence.ts"
      ],
      "referencedPackageScript": "check:admin-truth-sample-evidence",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-truth-sample-evidence:current:220",
      "sourceArtifact": "docs/agent-truth/admin-truth-sample-evidence.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-admin-truth-sample-evidence.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-truth-sample-evidence.ts"
      ],
      "referencedPackageScript": "check:admin-truth-sample-evidence",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-truth-source-sample:pass:221",
      "sourceArtifact": "docs/agent-truth/admin-truth-source-sample.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-admin-truth-source-sample.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-truth-source-sample.ts"
      ],
      "referencedPackageScript": "check:admin-truth-source-sample",
      "referencedTest": "tests/unit/admin-truth-source-sample.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-truth-source-sample:ready:222",
      "sourceArtifact": "docs/agent-truth/admin-truth-source-sample.md",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-admin-truth-source-sample.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-truth-source-sample.ts"
      ],
      "referencedPackageScript": "check:admin-truth-source-sample",
      "referencedTest": "tests/unit/admin-truth-source-sample.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-truth-source-sample:current:223",
      "sourceArtifact": "docs/agent-truth/admin-truth-source-sample.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-admin-truth-source-sample.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-truth-source-sample.ts"
      ],
      "referencedPackageScript": "check:admin-truth-source-sample",
      "referencedTest": "tests/unit/admin-truth-source-sample.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-users-latency-repair:pass:224",
      "sourceArtifact": "docs/agent-truth/admin-users-latency-repair.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-admin-users-latency-repair.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-users-latency-repair.ts"
      ],
      "referencedPackageScript": "check:admin-users-latency-repair",
      "referencedTest": "tests/unit/admin-users-latency-repair.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "advanced-telemetry-parity-ui-cleanup:pass:225",
      "sourceArtifact": "docs/agent-truth/advanced-telemetry-parity-ui-cleanup.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-advanced-telemetry-parity-ui-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-advanced-telemetry-parity-ui-cleanup.ts"
      ],
      "referencedPackageScript": "check:advanced-telemetry-parity-ui-cleanup",
      "referencedTest": "tests/unit/advanced-telemetry-parity-ui-cleanup.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "advanced-telemetry-parity-ui-cleanup:current:226",
      "sourceArtifact": "docs/agent-truth/advanced-telemetry-parity-ui-cleanup.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-advanced-telemetry-parity-ui-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-advanced-telemetry-parity-ui-cleanup.ts"
      ],
      "referencedPackageScript": "check:advanced-telemetry-parity-ui-cleanup",
      "referencedTest": "tests/unit/advanced-telemetry-parity-ui-cleanup.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-critic-p1-triage:pass:227",
      "sourceArtifact": "docs/agent-truth/ai-critic-p1-triage.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-ai-critic-p1-triage.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-critic-p1-triage.ts"
      ],
      "referencedPackageScript": "check:ai-critic-p1-triage",
      "referencedTest": "tests/unit/ai-critic-p1-triage.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-critic-p1-triage:ready:228",
      "sourceArtifact": "docs/agent-truth/ai-critic-p1-triage.md",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-ai-critic-p1-triage.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-critic-p1-triage.ts"
      ],
      "referencedPackageScript": "check:ai-critic-p1-triage",
      "referencedTest": "tests/unit/ai-critic-p1-triage.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-debug-critic:pass:229",
      "sourceArtifact": "docs/agent-truth/ai-debug-critic.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-ai-debug-critic.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-debug-critic.ts"
      ],
      "referencedPackageScript": "check:ai-debug-critic",
      "referencedTest": "tests/unit/ai-debug-critic.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-debug-critic:ready:230",
      "sourceArtifact": "docs/agent-truth/ai-debug-critic.md",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-ai-debug-critic.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-debug-critic.ts"
      ],
      "referencedPackageScript": "check:ai-debug-critic",
      "referencedTest": "tests/unit/ai-debug-critic.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-debug-critic:complete:231",
      "sourceArtifact": "docs/agent-truth/ai-debug-critic.md",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": "scripts/agent/validate-ai-debug-critic.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-debug-critic.ts"
      ],
      "referencedPackageScript": "check:ai-debug-critic",
      "referencedTest": "tests/unit/ai-debug-critic.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-debug-workbench-ui-model:pass:232",
      "sourceArtifact": "docs/agent-truth/ai-debug-workbench-ui-model.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-ai-debug-workbench-ui-model.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-debug-workbench-ui-model.ts"
      ],
      "referencedPackageScript": "check:ai-debug-workbench-ui-model",
      "referencedTest": "tests/unit/ai-debug-workbench-ui-model.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-description-feedback-firestore-cleanup:pass:233",
      "sourceArtifact": "docs/agent-truth/ai-description-feedback-firestore-cleanup.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-ai-description-feedback-firestore-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-description-feedback-firestore-cleanup.ts"
      ],
      "referencedPackageScript": "check:ai-description-feedback-firestore-cleanup",
      "referencedTest": "tests/unit/ai-description-feedback-firestore-cleanup.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-repair-context-packet:pass:234",
      "sourceArtifact": "docs/agent-truth/ai-repair-context-packet.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-ai-repair-context-packet.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-repair-context-packet.ts"
      ],
      "referencedPackageScript": "check:ai-repair-context-packet",
      "referencedTest": "tests/unit/ai-repair-context-packet.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-repair-critic-approval:pass:235",
      "sourceArtifact": "docs/agent-truth/ai-repair-critic-approval.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-ai-repair-critic-approval.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-repair-critic-approval.ts"
      ],
      "referencedPackageScript": "check:ai-repair-critic-approval",
      "referencedTest": "tests/unit/ai-repair-critic-approval.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-repair-planner:pass:236",
      "sourceArtifact": "docs/agent-truth/ai-repair-planner.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-ai-repair-planner.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-repair-planner.ts"
      ],
      "referencedPackageScript": "check:ai-repair-planner",
      "referencedTest": "tests/unit/ai-repair-planner.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-repair-planner:ready:237",
      "sourceArtifact": "docs/agent-truth/ai-repair-planner.md",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-ai-repair-planner.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-repair-planner.ts"
      ],
      "referencedPackageScript": "check:ai-repair-planner",
      "referencedTest": "tests/unit/ai-repair-planner.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-repair-proposal-workflow:pass:238",
      "sourceArtifact": "docs/agent-truth/ai-repair-proposal-workflow.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-ai-repair-proposal-workflow.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-repair-proposal-workflow.ts"
      ],
      "referencedPackageScript": "check:ai-repair-proposal-workflow",
      "referencedTest": "tests/unit/ai-repair-proposal-workflow.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-repair-triage-engine:pass:239",
      "sourceArtifact": "docs/agent-truth/ai-repair-triage-engine.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-ai-repair-triage-engine.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-repair-triage-engine.ts"
      ],
      "referencedPackageScript": "check:ai-repair-triage-engine",
      "referencedTest": "tests/unit/ai-repair-triage-engine.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "algorithmic-evidence-policy:current:240",
      "sourceArtifact": "docs/agent-truth/algorithmic-evidence-policy.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-algorithmic-evidence-policy.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-algorithmic-evidence-policy.ts"
      ],
      "referencedPackageScript": "check:algorithmic-evidence-policy",
      "referencedTest": "tests/unit/algorithmic-evidence-policy.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-actor-taxonomy:current:241",
      "sourceArtifact": "docs/agent-truth/analytics-actor-taxonomy.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-cadence-cost-policy:current:242",
      "sourceArtifact": "docs/agent-truth/analytics-cadence-cost-policy.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-analytics-cadence-cost-policy.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-cadence-cost-policy.ts"
      ],
      "referencedPackageScript": "check:analytics-cadence-cost-policy",
      "referencedTest": "tests/unit/analytics-cadence-cost-policy.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-cost-hot-path-reduction:pass:243",
      "sourceArtifact": "docs/agent-truth/analytics-cost-hot-path-reduction.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-analytics-cost-hot-path-reduction.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-cost-hot-path-reduction.ts"
      ],
      "referencedPackageScript": "check:analytics-cost-hot-path-reduction",
      "referencedTest": "tests/unit/analytics-cost-hot-path-reduction.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-cost-runtime-inventory:pass:244",
      "sourceArtifact": "docs/agent-truth/analytics-cost-runtime-inventory.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-analytics-cost-runtime-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-cost-runtime-inventory.ts"
      ],
      "referencedPackageScript": "check:analytics-cost-runtime-inventory",
      "referencedTest": "tests/unit/analytics-cost-runtime-inventory.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-cost-runtime-inventory:ready:245",
      "sourceArtifact": "docs/agent-truth/analytics-cost-runtime-inventory.md",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-analytics-cost-runtime-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-cost-runtime-inventory.ts"
      ],
      "referencedPackageScript": "check:analytics-cost-runtime-inventory",
      "referencedTest": "tests/unit/analytics-cost-runtime-inventory.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-cost-runtime-inventory:current:246",
      "sourceArtifact": "docs/agent-truth/analytics-cost-runtime-inventory.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-analytics-cost-runtime-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-cost-runtime-inventory.ts"
      ],
      "referencedPackageScript": "check:analytics-cost-runtime-inventory",
      "referencedTest": "tests/unit/analytics-cost-runtime-inventory.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-ecosystem-parity:pass:247",
      "sourceArtifact": "docs/agent-truth/analytics-ecosystem-parity.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": "tests/unit/analytics-ecosystem-parity.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-ecosystem-parity:current:248",
      "sourceArtifact": "docs/agent-truth/analytics-ecosystem-parity.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": "tests/unit/analytics-ecosystem-parity.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-file-inventory:complete:249",
      "sourceArtifact": "docs/agent-truth/analytics-file-inventory.md",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-file-inventory:current:250",
      "sourceArtifact": "docs/agent-truth/analytics-file-inventory.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-hot-path-cost-reduction:pass:251",
      "sourceArtifact": "docs/agent-truth/analytics-hot-path-cost-reduction.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-analytics-hot-path-cost-reduction.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-hot-path-cost-reduction.ts"
      ],
      "referencedPackageScript": "check:analytics-hot-path-cost-reduction",
      "referencedTest": "tests/unit/analytics-hot-path-cost-reduction.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-hot-path-cost-reduction:current:252",
      "sourceArtifact": "docs/agent-truth/analytics-hot-path-cost-reduction.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-analytics-hot-path-cost-reduction.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-hot-path-cost-reduction.ts"
      ],
      "referencedPackageScript": "check:analytics-hot-path-cost-reduction",
      "referencedTest": "tests/unit/analytics-hot-path-cost-reduction.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-identity-transfer-inventory:pass:253",
      "sourceArtifact": "docs/agent-truth/analytics-identity-transfer-inventory.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-analytics-identity-transfer-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-identity-transfer-inventory.ts"
      ],
      "referencedPackageScript": "check:analytics-identity-transfer-inventory",
      "referencedTest": "tests/unit/analytics-identity-transfer-inventory.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-identity-transfer-inventory:current:254",
      "sourceArtifact": "docs/agent-truth/analytics-identity-transfer-inventory.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-analytics-identity-transfer-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-identity-transfer-inventory.ts"
      ],
      "referencedPackageScript": "check:analytics-identity-transfer-inventory",
      "referencedTest": "tests/unit/analytics-identity-transfer-inventory.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-ingest-firestore-closure:pass:255",
      "sourceArtifact": "docs/agent-truth/analytics-ingest-firestore-closure.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-analytics-ingest-firestore-closure.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-ingest-firestore-closure.ts"
      ],
      "referencedPackageScript": "check:analytics-ingest-firestore-closure",
      "referencedTest": "tests/unit/analytics-ingest-firestore-closure.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-ingest-firestore-closure:current:256",
      "sourceArtifact": "docs/agent-truth/analytics-ingest-firestore-closure.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-analytics-ingest-firestore-closure.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-ingest-firestore-closure.ts"
      ],
      "referencedPackageScript": "check:analytics-ingest-firestore-closure",
      "referencedTest": "tests/unit/analytics-ingest-firestore-closure.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-legacy-history-reconciliation:pass:257",
      "sourceArtifact": "docs/agent-truth/analytics-legacy-history-reconciliation.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-analytics-legacy-history-reconciliation.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-legacy-history-reconciliation.ts"
      ],
      "referencedPackageScript": "check:analytics-legacy-history-reconciliation",
      "referencedTest": "tests/unit/analytics-legacy-history-reconciliation.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-legacy-history-reconciliation:current:258",
      "sourceArtifact": "docs/agent-truth/analytics-legacy-history-reconciliation.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-analytics-legacy-history-reconciliation.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-legacy-history-reconciliation.ts"
      ],
      "referencedPackageScript": "check:analytics-legacy-history-reconciliation",
      "referencedTest": "tests/unit/analytics-legacy-history-reconciliation.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-legacy-recovery-reconciliation:current:259",
      "sourceArtifact": "docs/agent-truth/analytics-legacy-recovery-reconciliation.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-analytics-legacy-recovery-reconciliation.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-legacy-recovery-reconciliation.ts"
      ],
      "referencedPackageScript": "check:analytics-legacy-recovery-reconciliation",
      "referencedTest": "tests/unit/analytics-legacy-recovery-reconciliation.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-legacy-recovery:pass:260",
      "sourceArtifact": "docs/agent-truth/analytics-legacy-recovery.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-analytics-legacy-recovery.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-legacy-recovery.ts"
      ],
      "referencedPackageScript": "check:analytics-legacy-recovery",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-legacy-recovery:current:261",
      "sourceArtifact": "docs/agent-truth/analytics-legacy-recovery.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-analytics-legacy-recovery.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-legacy-recovery.ts"
      ],
      "referencedPackageScript": "check:analytics-legacy-recovery",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-module-map:pass:262",
      "sourceArtifact": "docs/agent-truth/analytics-module-map.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-module-map:current:263",
      "sourceArtifact": "docs/agent-truth/analytics-module-map.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-rewire-phase-one:current:264",
      "sourceArtifact": "docs/agent-truth/analytics-rewire-phase-one.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-analytics-rewire-phase-one.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-rewire-phase-one.ts"
      ],
      "referencedPackageScript": "check:analytics-rewire-phase-one",
      "referencedTest": "tests/unit/analytics-rewire-phase-one.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-semantics-final-lock:ready:265",
      "sourceArtifact": "docs/agent-truth/analytics-semantics-final-lock.md",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-analytics-semantics-final-lock.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-semantics-final-lock.ts"
      ],
      "referencedPackageScript": "check:analytics-semantics-final-lock",
      "referencedTest": "tests/unit/analytics-semantics-final-lock.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-semantics-final-lock:current:266",
      "sourceArtifact": "docs/agent-truth/analytics-semantics-final-lock.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-analytics-semantics-final-lock.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-semantics-final-lock.ts"
      ],
      "referencedPackageScript": "check:analytics-semantics-final-lock",
      "referencedTest": "tests/unit/analytics-semantics-final-lock.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-semantics-final-lock:betaExitReady:267",
      "sourceArtifact": "docs/agent-truth/analytics-semantics-final-lock.md",
      "claimText": "betaExitReady",
      "claimedStatus": "betaExitReady",
      "referencedValidator": "scripts/agent/validate-analytics-semantics-final-lock.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-semantics-final-lock.ts"
      ],
      "referencedPackageScript": "check:analytics-semantics-final-lock",
      "referencedTest": "tests/unit/analytics-semantics-final-lock.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-source-agreement-cleanup:pass:268",
      "sourceArtifact": "docs/agent-truth/analytics-source-agreement-cleanup.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-analytics-source-agreement-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-source-agreement-cleanup.ts"
      ],
      "referencedPackageScript": "check:analytics-source-agreement-cleanup",
      "referencedTest": "tests/unit/analytics-source-agreement-cleanup.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-source-hierarchy:pass:269",
      "sourceArtifact": "docs/agent-truth/analytics-source-hierarchy.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-source-hierarchy:current:270",
      "sourceArtifact": "docs/agent-truth/analytics-source-hierarchy.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-truth-layer-v2:ready:271",
      "sourceArtifact": "docs/agent-truth/analytics-truth-layer-v2.md",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-analytics-truth-layer-v2.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-truth-layer-v2.ts"
      ],
      "referencedPackageScript": "check:analytics-truth-layer-v2",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-truth-layer-v2:current:272",
      "sourceArtifact": "docs/agent-truth/analytics-truth-layer-v2.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-analytics-truth-layer-v2.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-truth-layer-v2.ts"
      ],
      "referencedPackageScript": "check:analytics-truth-layer-v2",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-validation-semantics:pass:273",
      "sourceArtifact": "docs/agent-truth/analytics-validation-semantics.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-analytics-validation-semantics.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-validation-semantics.ts"
      ],
      "referencedPackageScript": "check:analytics-validation-semantics",
      "referencedTest": "tests/unit/analytics-validation-semantics.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ast-grep-rules:locked:274",
      "sourceArtifact": "docs/agent-truth/ast-grep-rules.md",
      "claimText": "locked",
      "claimedStatus": "locked",
      "referencedValidator": "scripts/agent/run-ast-grep-rules.ts",
      "referencedSourceFiles": [
        "scripts/agent/run-ast-grep-rules.ts"
      ],
      "referencedPackageScript": "check:ast-grep-rules",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "audit-cache:pass:275",
      "sourceArtifact": "docs/agent-truth/audit-cache.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-audit-cache.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-audit-cache.ts"
      ],
      "referencedPackageScript": "check:audit-cache",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "auth-persistence-stability:current:276",
      "sourceArtifact": "docs/agent-truth/auth-persistence-stability.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-auth-persistence-stability.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-auth-persistence-stability.ts"
      ],
      "referencedPackageScript": "check:auth-persistence-stability",
      "referencedTest": "tests/unit/auth-persistence-stability.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "auth-provider-conflict-resolution:complete:277",
      "sourceArtifact": "docs/agent-truth/auth-provider-conflict-resolution.md",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": "scripts/agent/validate-auth-provider-conflict-resolution.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-auth-provider-conflict-resolution.ts"
      ],
      "referencedPackageScript": "check:auth-provider-conflict-resolution",
      "referencedTest": "tests/unit/auth-provider-conflict-resolution.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "auth-provider-conflict-resolution:current:278",
      "sourceArtifact": "docs/agent-truth/auth-provider-conflict-resolution.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-auth-provider-conflict-resolution.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-auth-provider-conflict-resolution.ts"
      ],
      "referencedPackageScript": "check:auth-provider-conflict-resolution",
      "referencedTest": "tests/unit/auth-provider-conflict-resolution.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "auth-readiness-lock:pass:279",
      "sourceArtifact": "docs/agent-truth/auth-readiness-lock.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-auth-readiness-lock.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-auth-readiness-lock.ts"
      ],
      "referencedPackageScript": "check:auth-readiness-lock",
      "referencedTest": "tests/unit/auth-readiness-lock.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "auth-readiness-lock:locked:280",
      "sourceArtifact": "docs/agent-truth/auth-readiness-lock.md",
      "claimText": "locked",
      "claimedStatus": "locked",
      "referencedValidator": "scripts/agent/validate-auth-readiness-lock.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-auth-readiness-lock.ts"
      ],
      "referencedPackageScript": "check:auth-readiness-lock",
      "referencedTest": "tests/unit/auth-readiness-lock.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "auth-readiness-lock:current:281",
      "sourceArtifact": "docs/agent-truth/auth-readiness-lock.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-auth-readiness-lock.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-auth-readiness-lock.ts"
      ],
      "referencedPackageScript": "check:auth-readiness-lock",
      "referencedTest": "tests/unit/auth-readiness-lock.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "auth-runtime-telemetry:current:282",
      "sourceArtifact": "docs/agent-truth/auth-runtime-telemetry.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-auth-runtime-telemetry.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-auth-runtime-telemetry.ts"
      ],
      "referencedPackageScript": "check:auth-runtime-telemetry",
      "referencedTest": "tests/unit/auth-runtime-telemetry.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "automated-truth-reconciliation:pass:283",
      "sourceArtifact": "docs/agent-truth/automated-truth-reconciliation.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-automated-truth-reconciliation.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-automated-truth-reconciliation.ts"
      ],
      "referencedPackageScript": "check:automated-truth-reconciliation",
      "referencedTest": "tests/unit/automated-truth-reconciliation.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "automated-truth-reconciliation:ready:284",
      "sourceArtifact": "docs/agent-truth/automated-truth-reconciliation.md",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-automated-truth-reconciliation.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-automated-truth-reconciliation.ts"
      ],
      "referencedPackageScript": "check:automated-truth-reconciliation",
      "referencedTest": "tests/unit/automated-truth-reconciliation.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "automated-truth-reconciliation:locked:285",
      "sourceArtifact": "docs/agent-truth/automated-truth-reconciliation.md",
      "claimText": "locked",
      "claimedStatus": "locked",
      "referencedValidator": "scripts/agent/validate-automated-truth-reconciliation.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-automated-truth-reconciliation.ts"
      ],
      "referencedPackageScript": "check:automated-truth-reconciliation",
      "referencedTest": "tests/unit/automated-truth-reconciliation.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "automated-truth-reconciliation:complete:286",
      "sourceArtifact": "docs/agent-truth/automated-truth-reconciliation.md",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": "scripts/agent/validate-automated-truth-reconciliation.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-automated-truth-reconciliation.ts"
      ],
      "referencedPackageScript": "check:automated-truth-reconciliation",
      "referencedTest": "tests/unit/automated-truth-reconciliation.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "background-jobs-idempotency:current:287",
      "sourceArtifact": "docs/agent-truth/background-jobs-idempotency.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "behavior-math-status-cleanup:current:288",
      "sourceArtifact": "docs/agent-truth/behavior-math-status-cleanup.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-behavior-math-status-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-behavior-math-status-cleanup.ts"
      ],
      "referencedPackageScript": "check:behavior-math-status-cleanup",
      "referencedTest": "tests/unit/behavior-math-status-cleanup.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "behavioral-extensibility-layer:pass:289",
      "sourceArtifact": "docs/agent-truth/behavioral-extensibility-layer.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-behavioral-extensibility-layer.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-behavioral-extensibility-layer.ts"
      ],
      "referencedPackageScript": "check:behavioral-extensibility-layer",
      "referencedTest": "tests/unit/behavioral-extensibility-layer.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "behavioral-extensibility-layer:current:290",
      "sourceArtifact": "docs/agent-truth/behavioral-extensibility-layer.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-behavioral-extensibility-layer.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-behavioral-extensibility-layer.ts"
      ],
      "referencedPackageScript": "check:behavioral-extensibility-layer",
      "referencedTest": "tests/unit/behavioral-extensibility-layer.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "behavioral-math-calibration:pass:291",
      "sourceArtifact": "docs/agent-truth/behavioral-math-calibration.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-behavioral-math-calibration.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-behavioral-math-calibration.ts"
      ],
      "referencedPackageScript": "check:behavioral-math-calibration",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "behavioral-math-calibration:current:292",
      "sourceArtifact": "docs/agent-truth/behavioral-math-calibration.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-behavioral-math-calibration.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-behavioral-math-calibration.ts"
      ],
      "referencedPackageScript": "check:behavioral-math-calibration",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "behavioral-tracking-semantics-closure:pass:293",
      "sourceArtifact": "docs/agent-truth/behavioral-tracking-semantics-closure.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-behavioral-tracking-semantics-closure.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-behavioral-tracking-semantics-closure.ts"
      ],
      "referencedPackageScript": "check:behavioral-tracking-semantics-closure",
      "referencedTest": "tests/unit/behavioral-tracking-semantics-closure.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "behavioral-tracking-semantics-closure:current:294",
      "sourceArtifact": "docs/agent-truth/behavioral-tracking-semantics-closure.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-behavioral-tracking-semantics-closure.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-behavioral-tracking-semantics-closure.ts"
      ],
      "referencedPackageScript": "check:behavioral-tracking-semantics-closure",
      "referencedTest": "tests/unit/behavioral-tracking-semantics-closure.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-evidence-gap-map:pass:295",
      "sourceArtifact": "docs/agent-truth/beta-evidence-gap-map.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-beta-evidence-gap-map.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-evidence-gap-map.ts"
      ],
      "referencedPackageScript": "check:beta-evidence-gap-map",
      "referencedTest": "tests/unit/beta-evidence-gap-map.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-evidence-gap-map:ready:296",
      "sourceArtifact": "docs/agent-truth/beta-evidence-gap-map.md",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-beta-evidence-gap-map.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-evidence-gap-map.ts"
      ],
      "referencedPackageScript": "check:beta-evidence-gap-map",
      "referencedTest": "tests/unit/beta-evidence-gap-map.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-evidence-gap-map:current:297",
      "sourceArtifact": "docs/agent-truth/beta-evidence-gap-map.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-beta-evidence-gap-map.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-evidence-gap-map.ts"
      ],
      "referencedPackageScript": "check:beta-evidence-gap-map",
      "referencedTest": "tests/unit/beta-evidence-gap-map.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-evidence-gap-map:owner_review:298",
      "sourceArtifact": "docs/agent-truth/beta-evidence-gap-map.md",
      "claimText": "owner_review",
      "claimedStatus": "owner_review",
      "referencedValidator": "scripts/agent/validate-beta-evidence-gap-map.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-evidence-gap-map.ts"
      ],
      "referencedPackageScript": "check:beta-evidence-gap-map",
      "referencedTest": "tests/unit/beta-evidence-gap-map.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-evidence-lane-prep:ready:299",
      "sourceArtifact": "docs/agent-truth/beta-evidence-lane-prep.md",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-beta-evidence-lane-prep.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-evidence-lane-prep.ts"
      ],
      "referencedPackageScript": "check:beta-evidence-lane-prep",
      "referencedTest": "tests/unit/beta-evidence-lane-prep.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-evidence-lane-prep:current:300",
      "sourceArtifact": "docs/agent-truth/beta-evidence-lane-prep.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-beta-evidence-lane-prep.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-evidence-lane-prep.ts"
      ],
      "referencedPackageScript": "check:beta-evidence-lane-prep",
      "referencedTest": "tests/unit/beta-evidence-lane-prep.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-evidence-lane-prep:formal_missing:301",
      "sourceArtifact": "docs/agent-truth/beta-evidence-lane-prep.md",
      "claimText": "formal_missing",
      "claimedStatus": "formal_missing",
      "referencedValidator": "scripts/agent/validate-beta-evidence-lane-prep.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-evidence-lane-prep.ts"
      ],
      "referencedPackageScript": "check:beta-evidence-lane-prep",
      "referencedTest": "tests/unit/beta-evidence-lane-prep.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "formal_evidence_required",
      "contradictionFound": false,
      "exactNextAction": "Attach formal operator/provider/runtime/admin evidence; do not clear this by source validation."
    },
    {
      "claimId": "beta-freshness-language:pass:302",
      "sourceArtifact": "docs/agent-truth/beta-freshness-language.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-beta-freshness-language.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-freshness-language.ts"
      ],
      "referencedPackageScript": "check:beta-freshness-language",
      "referencedTest": "tests/unit/beta-freshness-language.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-freshness-language:current:303",
      "sourceArtifact": "docs/agent-truth/beta-freshness-language.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-beta-freshness-language.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-freshness-language.ts"
      ],
      "referencedPackageScript": "check:beta-freshness-language",
      "referencedTest": "tests/unit/beta-freshness-language.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-health-algorithm-v2:pass:304",
      "sourceArtifact": "docs/agent-truth/beta-health-algorithm-v2.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-beta-health-algorithm-v2.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-health-algorithm-v2.ts"
      ],
      "referencedPackageScript": "check:beta-health-algorithm-v2",
      "referencedTest": "tests/unit/beta-health-algorithm-v2.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-health-algorithm-v2:ready:305",
      "sourceArtifact": "docs/agent-truth/beta-health-algorithm-v2.md",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-beta-health-algorithm-v2.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-health-algorithm-v2.ts"
      ],
      "referencedPackageScript": "check:beta-health-algorithm-v2",
      "referencedTest": "tests/unit/beta-health-algorithm-v2.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-health-algorithm-v2:current:306",
      "sourceArtifact": "docs/agent-truth/beta-health-algorithm-v2.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-beta-health-algorithm-v2.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-health-algorithm-v2.ts"
      ],
      "referencedPackageScript": "check:beta-health-algorithm-v2",
      "referencedTest": "tests/unit/beta-health-algorithm-v2.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-health-algorithm-v2:formal_passed:307",
      "sourceArtifact": "docs/agent-truth/beta-health-algorithm-v2.md",
      "claimText": "formal_passed",
      "claimedStatus": "formal_passed",
      "referencedValidator": "scripts/agent/validate-beta-health-algorithm-v2.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-health-algorithm-v2.ts"
      ],
      "referencedPackageScript": "check:beta-health-algorithm-v2",
      "referencedTest": "tests/unit/beta-health-algorithm-v2.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-roadmap:current:308",
      "sourceArtifact": "docs/agent-truth/beta-roadmap.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-score-cleanup:pass:309",
      "sourceArtifact": "docs/agent-truth/beta-score-cleanup.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-beta-score-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-score-cleanup.ts"
      ],
      "referencedPackageScript": "check:beta-score-cleanup",
      "referencedTest": "tests/unit/beta-score-cleanup.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-score-cleanup:current:310",
      "sourceArtifact": "docs/agent-truth/beta-score-cleanup.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-beta-score-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-score-cleanup.ts"
      ],
      "referencedPackageScript": "check:beta-score-cleanup",
      "referencedTest": "tests/unit/beta-score-cleanup.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-score-cleanup:cost_review_required:311",
      "sourceArtifact": "docs/agent-truth/beta-score-cleanup.md",
      "claimText": "cost_review_required",
      "claimedStatus": "cost_review_required",
      "referencedValidator": "scripts/agent/validate-beta-score-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-score-cleanup.ts"
      ],
      "referencedPackageScript": "check:beta-score-cleanup",
      "referencedTest": "tests/unit/beta-score-cleanup.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "bigquery-cloud-pipeline-closure:current:312",
      "sourceArtifact": "docs/agent-truth/bigquery-cloud-pipeline-closure.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-bigquery-cloud-pipeline-closure.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-bigquery-cloud-pipeline-closure.ts"
      ],
      "referencedPackageScript": "check:bigquery-cloud-pipeline-closure",
      "referencedTest": "tests/unit/bigquery-cloud-pipeline-closure.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "blocked-refresh-queue-resolver:pass:313",
      "sourceArtifact": "docs/agent-truth/blocked-refresh-queue-resolver.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-blocked-refresh-queue-resolver.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-blocked-refresh-queue-resolver.ts"
      ],
      "referencedPackageScript": "check:blocked-refresh-queue-resolver",
      "referencedTest": "tests/unit/blocked-refresh-queue-resolver.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "blocked-refresh-queue-resolver:current:314",
      "sourceArtifact": "docs/agent-truth/blocked-refresh-queue-resolver.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-blocked-refresh-queue-resolver.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-blocked-refresh-queue-resolver.ts"
      ],
      "referencedPackageScript": "check:blocked-refresh-queue-resolver",
      "referencedTest": "tests/unit/blocked-refresh-queue-resolver.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "body-system-wiring-repair:pass:315",
      "sourceArtifact": "docs/agent-truth/body-system-wiring-repair.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-body-system-wiring-repair.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-body-system-wiring-repair.ts"
      ],
      "referencedPackageScript": "check:body-system-wiring-repair",
      "referencedTest": "tests/unit/body-system-wiring-repair.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "body-system-wiring-repair:ready:316",
      "sourceArtifact": "docs/agent-truth/body-system-wiring-repair.md",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-body-system-wiring-repair.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-body-system-wiring-repair.ts"
      ],
      "referencedPackageScript": "check:body-system-wiring-repair",
      "referencedTest": "tests/unit/body-system-wiring-repair.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "body-system-wiring-repair:current:317",
      "sourceArtifact": "docs/agent-truth/body-system-wiring-repair.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-body-system-wiring-repair.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-body-system-wiring-repair.ts"
      ],
      "referencedPackageScript": "check:body-system-wiring-repair",
      "referencedTest": "tests/unit/body-system-wiring-repair.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "bug-report-reward-flow:current:318",
      "sourceArtifact": "docs/agent-truth/bug-report-reward-flow.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-bug-report-reward-flow.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-bug-report-reward-flow.ts"
      ],
      "referencedPackageScript": "check:bug-report-reward-flow",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "bug-report-truth-source-cleanup:pass:319",
      "sourceArtifact": "docs/agent-truth/bug-report-truth-source-cleanup.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-bug-report-truth-source-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-bug-report-truth-source-cleanup.ts"
      ],
      "referencedPackageScript": "check:bug-report-truth-source-cleanup",
      "referencedTest": "tests/unit/bug-report-truth-source-cleanup.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "bug-report-truth-terminal-state:pass:320",
      "sourceArtifact": "docs/agent-truth/bug-report-truth-terminal-state.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-bug-report-truth-terminal-state.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-bug-report-truth-terminal-state.ts"
      ],
      "referencedPackageScript": "check:bug-report-truth-terminal-state",
      "referencedTest": "tests/unit/bug-report-truth-terminal-state.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "canonical-math-authority-ledger:pass:321",
      "sourceArtifact": "docs/agent-truth/canonical-math-authority-ledger.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-canonical-math-authority-ledger.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-canonical-math-authority-ledger.ts"
      ],
      "referencedPackageScript": "check:canonical-math-authority-ledger",
      "referencedTest": "tests/unit/canonical-math-authority-ledger.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "canonical-math-authority-ledger:ready:322",
      "sourceArtifact": "docs/agent-truth/canonical-math-authority-ledger.md",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-canonical-math-authority-ledger.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-canonical-math-authority-ledger.ts"
      ],
      "referencedPackageScript": "check:canonical-math-authority-ledger",
      "referencedTest": "tests/unit/canonical-math-authority-ledger.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "canonical-math-authority-ledger:current:323",
      "sourceArtifact": "docs/agent-truth/canonical-math-authority-ledger.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-canonical-math-authority-ledger.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-canonical-math-authority-ledger.ts"
      ],
      "referencedPackageScript": "check:canonical-math-authority-ledger",
      "referencedTest": "tests/unit/canonical-math-authority-ledger.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "canonical-math-ledger:pass:324",
      "sourceArtifact": "docs/agent-truth/canonical-math-ledger.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-canonical-math-ledger.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-canonical-math-ledger.ts"
      ],
      "referencedPackageScript": "check:canonical-math-ledger",
      "referencedTest": "tests/unit/canonical-math-ledger.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "canonical-math-ledger:current:325",
      "sourceArtifact": "docs/agent-truth/canonical-math-ledger.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-canonical-math-ledger.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-canonical-math-ledger.ts"
      ],
      "referencedPackageScript": "check:canonical-math-ledger",
      "referencedTest": "tests/unit/canonical-math-ledger.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "central-normalizer-spine:pass:326",
      "sourceArtifact": "docs/agent-truth/central-normalizer-spine.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-central-normalizer-spine.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-central-normalizer-spine.ts"
      ],
      "referencedPackageScript": "check:central-normalizer-spine",
      "referencedTest": "tests/unit/central-normalizer-spine.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "central-normalizer-spine:current:327",
      "sourceArtifact": "docs/agent-truth/central-normalizer-spine.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-central-normalizer-spine.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-central-normalizer-spine.ts"
      ],
      "referencedPackageScript": "check:central-normalizer-spine",
      "referencedTest": "tests/unit/central-normalizer-spine.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chart-readiness-hierarchy-repair:pass:328",
      "sourceArtifact": "docs/agent-truth/chart-readiness-hierarchy-repair.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-chart-readiness-hierarchy-repair.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-chart-readiness-hierarchy-repair.ts"
      ],
      "referencedPackageScript": "check:chart-readiness-hierarchy-repair",
      "referencedTest": "tests/unit/chart-readiness-hierarchy-repair.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chart-readiness-hierarchy-repair:ready:329",
      "sourceArtifact": "docs/agent-truth/chart-readiness-hierarchy-repair.md",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-chart-readiness-hierarchy-repair.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-chart-readiness-hierarchy-repair.ts"
      ],
      "referencedPackageScript": "check:chart-readiness-hierarchy-repair",
      "referencedTest": "tests/unit/chart-readiness-hierarchy-repair.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chat-composer-modal-lift:pass:330",
      "sourceArtifact": "docs/agent-truth/chat-composer-modal-lift.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-chat-composer-modal-lift.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-chat-composer-modal-lift.ts"
      ],
      "referencedPackageScript": "check:chat-composer-modal-lift",
      "referencedTest": "tests/unit/chat-composer-modal-lift.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chat-composer-modal-lift:current:331",
      "sourceArtifact": "docs/agent-truth/chat-composer-modal-lift.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-chat-composer-modal-lift.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-chat-composer-modal-lift.ts"
      ],
      "referencedPackageScript": "check:chat-composer-modal-lift",
      "referencedTest": "tests/unit/chat-composer-modal-lift.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chat-functionality-score-lock:pass:332",
      "sourceArtifact": "docs/agent-truth/chat-functionality-score-lock.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-chat-functionality-score-lock.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-chat-functionality-score-lock.ts"
      ],
      "referencedPackageScript": "check:chat-functionality-score-lock",
      "referencedTest": "tests/unit/chat-functionality-score-lock.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chat-functionality-score-lock:current:333",
      "sourceArtifact": "docs/agent-truth/chat-functionality-score-lock.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-chat-functionality-score-lock.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-chat-functionality-score-lock.ts"
      ],
      "referencedPackageScript": "check:chat-functionality-score-lock",
      "referencedTest": "tests/unit/chat-functionality-score-lock.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chat-gating-moderation:pass:334",
      "sourceArtifact": "docs/agent-truth/chat-gating-moderation.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-chat-gating-moderation.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-chat-gating-moderation.ts"
      ],
      "referencedPackageScript": "check:chat-gating-moderation",
      "referencedTest": "tests/unit/chat-gating-moderation.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chat-media-limits:pass:335",
      "sourceArtifact": "docs/agent-truth/chat-media-limits.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": "tests/unit/chat-media-limits.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chat-media-limits:complete:336",
      "sourceArtifact": "docs/agent-truth/chat-media-limits.md",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": "tests/unit/chat-media-limits.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chat-paid-gumdrops-guidance:current:337",
      "sourceArtifact": "docs/agent-truth/chat-paid-gumdrops-guidance.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-chat-paid-gumdrops-guidance.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-chat-paid-gumdrops-guidance.ts"
      ],
      "referencedPackageScript": "check:chat-paid-gumdrops-guidance",
      "referencedTest": "tests/unit/chat-paid-gumdrops-guidance.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chat-presence-typing:pass:338",
      "sourceArtifact": "docs/agent-truth/chat-presence-typing.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-chat-presence-typing.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-chat-presence-typing.ts"
      ],
      "referencedPackageScript": "check:chat-presence-typing",
      "referencedTest": "tests/unit/chat-presence-typing.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chat-route-cohort-runtime:current:339",
      "sourceArtifact": "docs/agent-truth/chat-route-cohort-runtime.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-chat-route-cohort-runtime.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-chat-route-cohort-runtime.ts"
      ],
      "referencedPackageScript": "check:chat-route-cohort-runtime",
      "referencedTest": "tests/unit/chat-route-cohort-runtime.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "claim-truth-audit:pass:340",
      "sourceArtifact": "docs/agent-truth/claim-truth-audit.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-claim-truth-audit.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-claim-truth-audit.ts"
      ],
      "referencedPackageScript": "check:claim-truth-audit",
      "referencedTest": "tests/unit/claim-truth-audit.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "claim-truth-audit:ready:341",
      "sourceArtifact": "docs/agent-truth/claim-truth-audit.md",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-claim-truth-audit.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-claim-truth-audit.ts"
      ],
      "referencedPackageScript": "check:claim-truth-audit",
      "referencedTest": "tests/unit/claim-truth-audit.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "claim-truth-audit:locked:342",
      "sourceArtifact": "docs/agent-truth/claim-truth-audit.md",
      "claimText": "locked",
      "claimedStatus": "locked",
      "referencedValidator": "scripts/agent/validate-claim-truth-audit.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-claim-truth-audit.ts"
      ],
      "referencedPackageScript": "check:claim-truth-audit",
      "referencedTest": "tests/unit/claim-truth-audit.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "claim-truth-audit:complete:343",
      "sourceArtifact": "docs/agent-truth/claim-truth-audit.md",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": "scripts/agent/validate-claim-truth-audit.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-claim-truth-audit.ts"
      ],
      "referencedPackageScript": "check:claim-truth-audit",
      "referencedTest": "tests/unit/claim-truth-audit.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cloud-sql-gemini-cost-guards:current:344",
      "sourceArtifact": "docs/agent-truth/cloud-sql-gemini-cost-guards.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-cloud-sql-gemini-cost-guards.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-cloud-sql-gemini-cost-guards.ts"
      ],
      "referencedPackageScript": "check:cloud-sql-gemini-cost-guards",
      "referencedTest": "tests/unit/cloud-sql-gemini-cost-guards.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cloudrun-sql-bigquery-guardrails:current:345",
      "sourceArtifact": "docs/agent-truth/cloudrun-sql-bigquery-guardrails.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "codebase-hardening:pass:346",
      "sourceArtifact": "docs/agent-truth/codebase-hardening.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "codebase-hardening:locked:347",
      "sourceArtifact": "docs/agent-truth/codebase-hardening.md",
      "claimText": "locked",
      "claimedStatus": "locked",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "codebase-organization-hardening:pass:348",
      "sourceArtifact": "docs/agent-truth/codebase-organization-hardening.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-codebase-organization-hardening.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-codebase-organization-hardening.ts"
      ],
      "referencedPackageScript": "check:codebase-organization-hardening",
      "referencedTest": "tests/unit/codebase-organization-hardening.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "codebase-organization-hardening:current:349",
      "sourceArtifact": "docs/agent-truth/codebase-organization-hardening.md",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-codebase-organization-hardening.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-codebase-organization-hardening.ts"
      ],
      "referencedPackageScript": "check:codebase-organization-hardening",
      "referencedTest": "tests/unit/codebase-organization-hardening.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "codex-execution-guardrails:pass:350",
      "sourceArtifact": "docs/agent-truth/codex-execution-guardrails.md",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "source_proven_only",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    }
  ],
  "unprovenClaims": [
    {
      "claimId": "4xx-cost-guardrails:pass:1",
      "sourceArtifact": "agent/state/4xx-cost-guardrails.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": "tests/unit/4xx-cost-guardrails.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "accessibility-tap-target-audit:pass:2",
      "sourceArtifact": "agent/state/accessibility-tap-target-audit.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "accessibility-tap-target-audit:current:3",
      "sourceArtifact": "agent/state/accessibility-tap-target-audit.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "account-settings-delete-flow:pass:4",
      "sourceArtifact": "agent/state/account-settings-delete-flow.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-account-settings-delete-flow.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-account-settings-delete-flow.ts"
      ],
      "referencedPackageScript": "check:account-settings-delete-flow",
      "referencedTest": "tests/unit/account-settings-delete-flow.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "80ff5ebbd6a11a027951de58f1c8e1e859295785",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "account-settings-mobile-padding:pass:5",
      "sourceArtifact": "agent/state/account-settings-mobile-padding.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-account-settings-mobile-padding.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-account-settings-mobile-padding.ts"
      ],
      "referencedPackageScript": "check:account-settings-mobile-padding",
      "referencedTest": "tests/unit/account-settings-mobile-padding.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "41548a214020ae5be78fc5b546d61b6c5b48fb40",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "activity-verification-engine:pass:6",
      "sourceArtifact": "agent/state/activity-verification-engine.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-activity-verification-engine.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-activity-verification-engine.ts"
      ],
      "referencedPackageScript": "check:activity-verification-engine",
      "referencedTest": "tests/unit/activity-verification-engine.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "79ad1387e6438832a915bed94e0cdbd3d4a7fddb",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "activity-verification-engine:ready:7",
      "sourceArtifact": "agent/state/activity-verification-engine.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-activity-verification-engine.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-activity-verification-engine.ts"
      ],
      "referencedPackageScript": "check:activity-verification-engine",
      "referencedTest": "tests/unit/activity-verification-engine.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "79ad1387e6438832a915bed94e0cdbd3d4a7fddb",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-debug-cost-reduction:pass:8",
      "sourceArtifact": "agent/state/admin-analytics-debug-cost-reduction.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-admin-analytics-debug-cost-reduction.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-analytics-debug-cost-reduction.ts"
      ],
      "referencedPackageScript": "check:admin-analytics-debug-cost-reduction",
      "referencedTest": "tests/unit/admin-analytics-debug-cost-reduction.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "3878a581193dd171f69e3c0b63073ac738c14152",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-finalization:pass:9",
      "sourceArtifact": "agent/state/admin-analytics-finalization.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-admin-analytics-finalization.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-analytics-finalization.ts"
      ],
      "referencedPackageScript": "check:admin-analytics-finalization",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-finalization:current:10",
      "sourceArtifact": "agent/state/admin-analytics-finalization.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-admin-analytics-finalization.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-analytics-finalization.ts"
      ],
      "referencedPackageScript": "check:admin-analytics-finalization",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-analytics-realtime-dependency-audit:current:11",
      "sourceArtifact": "agent/state/admin-analytics-realtime-dependency-audit.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-cms-workflow-audit:locked:12",
      "sourceArtifact": "agent/state/admin-cms-workflow-audit.generated.json",
      "claimText": "locked",
      "claimedStatus": "locked",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-cms-workflow-audit:complete:13",
      "sourceArtifact": "agent/state/admin-cms-workflow-audit.generated.json",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-cms-workflow-audit:current:14",
      "sourceArtifact": "agent/state/admin-cms-workflow-audit.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-surface-hydration:ready:15",
      "sourceArtifact": "agent/state/admin-surface-hydration.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-admin-surface-hydration.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-surface-hydration.ts"
      ],
      "referencedPackageScript": "check:admin-surface-hydration",
      "referencedTest": "tests/unit/admin-surface-hydration.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-truth-sample-evidence:pass:17",
      "sourceArtifact": "agent/state/admin-truth-sample-evidence.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-admin-truth-sample-evidence.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-truth-sample-evidence.ts"
      ],
      "referencedPackageScript": "check:admin-truth-sample-evidence",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "4958214e1e6ed79d3be73853dc7ba896524068eb",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-truth-sample-evidence:current:18",
      "sourceArtifact": "agent/state/admin-truth-sample-evidence.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-admin-truth-sample-evidence.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-truth-sample-evidence.ts"
      ],
      "referencedPackageScript": "check:admin-truth-sample-evidence",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "4958214e1e6ed79d3be73853dc7ba896524068eb",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-truth-source-sample:pass:19",
      "sourceArtifact": "agent/state/admin-truth-source-sample.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-admin-truth-source-sample.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-truth-source-sample.ts"
      ],
      "referencedPackageScript": "check:admin-truth-source-sample",
      "referencedTest": "tests/unit/admin-truth-source-sample.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d1f8e2fb4435ad131c8fc7cc85debe027a31346a",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "admin-truth-source-sample:current:20",
      "sourceArtifact": "agent/state/admin-truth-source-sample.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-admin-truth-source-sample.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-admin-truth-source-sample.ts"
      ],
      "referencedPackageScript": "check:admin-truth-source-sample",
      "referencedTest": "tests/unit/admin-truth-source-sample.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d1f8e2fb4435ad131c8fc7cc85debe027a31346a",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "advanced-telemetry-parity-ui-cleanup:current:21",
      "sourceArtifact": "agent/state/advanced-telemetry-parity-ui-cleanup.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-advanced-telemetry-parity-ui-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-advanced-telemetry-parity-ui-cleanup.ts"
      ],
      "referencedPackageScript": "check:advanced-telemetry-parity-ui-cleanup",
      "referencedTest": "tests/unit/advanced-telemetry-parity-ui-cleanup.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "9dc79a00f40df751841c8d8f10d98de636336397",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-critic-p1-triage:pass:22",
      "sourceArtifact": "agent/state/ai-critic-p1-triage.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-ai-critic-p1-triage.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-critic-p1-triage.ts"
      ],
      "referencedPackageScript": "check:ai-critic-p1-triage",
      "referencedTest": "tests/unit/ai-critic-p1-triage.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "bbd8d8c7da74cf60bb978373242a76e5e0f305d7",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-critic-p1-triage:ready:23",
      "sourceArtifact": "agent/state/ai-critic-p1-triage.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-ai-critic-p1-triage.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-critic-p1-triage.ts"
      ],
      "referencedPackageScript": "check:ai-critic-p1-triage",
      "referencedTest": "tests/unit/ai-critic-p1-triage.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "bbd8d8c7da74cf60bb978373242a76e5e0f305d7",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-critic-p1-triage:complete:24",
      "sourceArtifact": "agent/state/ai-critic-p1-triage.generated.json",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": "scripts/agent/validate-ai-critic-p1-triage.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-critic-p1-triage.ts"
      ],
      "referencedPackageScript": "check:ai-critic-p1-triage",
      "referencedTest": "tests/unit/ai-critic-p1-triage.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "bbd8d8c7da74cf60bb978373242a76e5e0f305d7",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-critic-p1-triage:current:25",
      "sourceArtifact": "agent/state/ai-critic-p1-triage.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-ai-critic-p1-triage.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-critic-p1-triage.ts"
      ],
      "referencedPackageScript": "check:ai-critic-p1-triage",
      "referencedTest": "tests/unit/ai-critic-p1-triage.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "bbd8d8c7da74cf60bb978373242a76e5e0f305d7",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-debug-critic:pass:26",
      "sourceArtifact": "agent/state/ai-debug-critic.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-ai-debug-critic.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-debug-critic.ts"
      ],
      "referencedPackageScript": "check:ai-debug-critic",
      "referencedTest": "tests/unit/ai-debug-critic.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-debug-critic:current:27",
      "sourceArtifact": "agent/state/ai-debug-critic.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-ai-debug-critic.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-debug-critic.ts"
      ],
      "referencedPackageScript": "check:ai-debug-critic",
      "referencedTest": "tests/unit/ai-debug-critic.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-debug-planner:pass:28",
      "sourceArtifact": "agent/state/ai-debug-planner.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-ai-debug-planner.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-debug-planner.ts"
      ],
      "referencedPackageScript": "check:ai-debug-planner",
      "referencedTest": "tests/unit/ai-debug-planner.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "ai-debug-planner:ready:29",
      "sourceArtifact": "agent/state/ai-debug-planner.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-ai-debug-planner.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-ai-debug-planner.ts"
      ],
      "referencedPackageScript": "check:ai-debug-planner",
      "referencedTest": "tests/unit/ai-debug-planner.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "algorithmic-evidence-policy:ready:30",
      "sourceArtifact": "agent/state/algorithmic-evidence-policy.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-algorithmic-evidence-policy.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-algorithmic-evidence-policy.ts"
      ],
      "referencedPackageScript": "check:algorithmic-evidence-policy",
      "referencedTest": "tests/unit/algorithmic-evidence-policy.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "e7d4eb198c8b9f728589fe48b41345f295a854d1",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "algorithmic-evidence-policy:current:31",
      "sourceArtifact": "agent/state/algorithmic-evidence-policy.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-algorithmic-evidence-policy.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-algorithmic-evidence-policy.ts"
      ],
      "referencedPackageScript": "check:algorithmic-evidence-policy",
      "referencedTest": "tests/unit/algorithmic-evidence-policy.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "e7d4eb198c8b9f728589fe48b41345f295a854d1",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-cost-hot-path-reduction:pass:32",
      "sourceArtifact": "agent/state/analytics-cost-hot-path-reduction.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-analytics-cost-hot-path-reduction.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-cost-hot-path-reduction.ts"
      ],
      "referencedPackageScript": "check:analytics-cost-hot-path-reduction",
      "referencedTest": "tests/unit/analytics-cost-hot-path-reduction.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d8f818a75f5b7e195937878e15058d63a4cc40fd",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-cost-hot-path-reduction:current:33",
      "sourceArtifact": "agent/state/analytics-cost-hot-path-reduction.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-analytics-cost-hot-path-reduction.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-cost-hot-path-reduction.ts"
      ],
      "referencedPackageScript": "check:analytics-cost-hot-path-reduction",
      "referencedTest": "tests/unit/analytics-cost-hot-path-reduction.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d8f818a75f5b7e195937878e15058d63a4cc40fd",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-cost-runtime-inventory:pass:34",
      "sourceArtifact": "agent/state/analytics-cost-runtime-inventory.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-analytics-cost-runtime-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-cost-runtime-inventory.ts"
      ],
      "referencedPackageScript": "check:analytics-cost-runtime-inventory",
      "referencedTest": "tests/unit/analytics-cost-runtime-inventory.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "b375acf9361858bfb97d9e3fac8877bb230a596c",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-cost-runtime-inventory:ready:35",
      "sourceArtifact": "agent/state/analytics-cost-runtime-inventory.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-analytics-cost-runtime-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-cost-runtime-inventory.ts"
      ],
      "referencedPackageScript": "check:analytics-cost-runtime-inventory",
      "referencedTest": "tests/unit/analytics-cost-runtime-inventory.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "b375acf9361858bfb97d9e3fac8877bb230a596c",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-ecosystem-parity:pass:36",
      "sourceArtifact": "agent/state/analytics-ecosystem-parity.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": "tests/unit/analytics-ecosystem-parity.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-ecosystem-parity:complete:37",
      "sourceArtifact": "agent/state/analytics-ecosystem-parity.generated.json",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": "tests/unit/analytics-ecosystem-parity.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-hot-path-cost-reduction:pass:38",
      "sourceArtifact": "agent/state/analytics-hot-path-cost-reduction.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-analytics-hot-path-cost-reduction.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-hot-path-cost-reduction.ts"
      ],
      "referencedPackageScript": "check:analytics-hot-path-cost-reduction",
      "referencedTest": "tests/unit/analytics-hot-path-cost-reduction.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "b83c1225ffd93a16f6aecdd9b0081695613e32da",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-hot-path-cost-reduction:current:39",
      "sourceArtifact": "agent/state/analytics-hot-path-cost-reduction.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-analytics-hot-path-cost-reduction.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-hot-path-cost-reduction.ts"
      ],
      "referencedPackageScript": "check:analytics-hot-path-cost-reduction",
      "referencedTest": "tests/unit/analytics-hot-path-cost-reduction.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "b83c1225ffd93a16f6aecdd9b0081695613e32da",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-identity-transfer-inventory:pass:40",
      "sourceArtifact": "agent/state/analytics-identity-transfer-inventory.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-analytics-identity-transfer-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-identity-transfer-inventory.ts"
      ],
      "referencedPackageScript": "check:analytics-identity-transfer-inventory",
      "referencedTest": "tests/unit/analytics-identity-transfer-inventory.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "5804de2bee6bb7ee37b6764af26094c391d03abf",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-identity-transfer-inventory:current:41",
      "sourceArtifact": "agent/state/analytics-identity-transfer-inventory.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-analytics-identity-transfer-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-identity-transfer-inventory.ts"
      ],
      "referencedPackageScript": "check:analytics-identity-transfer-inventory",
      "referencedTest": "tests/unit/analytics-identity-transfer-inventory.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "5804de2bee6bb7ee37b6764af26094c391d03abf",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-ingest-firestore-closure:pass:42",
      "sourceArtifact": "agent/state/analytics-ingest-firestore-closure.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-analytics-ingest-firestore-closure.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-ingest-firestore-closure.ts"
      ],
      "referencedPackageScript": "check:analytics-ingest-firestore-closure",
      "referencedTest": "tests/unit/analytics-ingest-firestore-closure.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "13dc614b575932b3bc589acabe8cccb675a2f614",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-ingest-identified-repair:complete:43",
      "sourceArtifact": "agent/state/analytics-ingest-identified-repair.generated.json",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": "scripts/agent/validate-analytics-ingest-identified-repair.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-ingest-identified-repair.ts"
      ],
      "referencedPackageScript": "check:analytics-ingest-identified-repair",
      "referencedTest": "tests/unit/analytics-ingest-identified-repair.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-ingest-identified-repair:current:44",
      "sourceArtifact": "agent/state/analytics-ingest-identified-repair.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-analytics-ingest-identified-repair.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-ingest-identified-repair.ts"
      ],
      "referencedPackageScript": "check:analytics-ingest-identified-repair",
      "referencedTest": "tests/unit/analytics-ingest-identified-repair.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-legacy-history-reconciliation:pass:45",
      "sourceArtifact": "agent/state/analytics-legacy-history-reconciliation.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-analytics-legacy-history-reconciliation.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-legacy-history-reconciliation.ts"
      ],
      "referencedPackageScript": "check:analytics-legacy-history-reconciliation",
      "referencedTest": "tests/unit/analytics-legacy-history-reconciliation.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "c85b7c584648f4283da9a1f6795e9b9406654406",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-legacy-history-reconciliation:current:46",
      "sourceArtifact": "agent/state/analytics-legacy-history-reconciliation.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-analytics-legacy-history-reconciliation.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-legacy-history-reconciliation.ts"
      ],
      "referencedPackageScript": "check:analytics-legacy-history-reconciliation",
      "referencedTest": "tests/unit/analytics-legacy-history-reconciliation.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "c85b7c584648f4283da9a1f6795e9b9406654406",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-legacy-recovery-reconciliation:current:47",
      "sourceArtifact": "agent/state/analytics-legacy-recovery-reconciliation.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-analytics-legacy-recovery-reconciliation.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-legacy-recovery-reconciliation.ts"
      ],
      "referencedPackageScript": "check:analytics-legacy-recovery-reconciliation",
      "referencedTest": "tests/unit/analytics-legacy-recovery-reconciliation.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d14d5d10899b0784d0743319a45c83854443a49a",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-rewire-phase-one:current:48",
      "sourceArtifact": "agent/state/analytics-rewire-phase-one.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-analytics-rewire-phase-one.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-rewire-phase-one.ts"
      ],
      "referencedPackageScript": "check:analytics-rewire-phase-one",
      "referencedTest": "tests/unit/analytics-rewire-phase-one.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "142bba579d7a2f0b73610b0b5f0498a26e19b836",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-semantics-final-lock:ready:49",
      "sourceArtifact": "agent/state/analytics-semantics-final-lock.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-analytics-semantics-final-lock.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-semantics-final-lock.ts"
      ],
      "referencedPackageScript": "check:analytics-semantics-final-lock",
      "referencedTest": "tests/unit/analytics-semantics-final-lock.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "2e91fea3b74d8c5e1122a1fe7acb475510e9019a",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-semantics-final-lock:betaExitReady:50",
      "sourceArtifact": "agent/state/analytics-semantics-final-lock.generated.json",
      "claimText": "betaExitReady",
      "claimedStatus": "betaExitReady",
      "referencedValidator": "scripts/agent/validate-analytics-semantics-final-lock.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-semantics-final-lock.ts"
      ],
      "referencedPackageScript": "check:analytics-semantics-final-lock",
      "referencedTest": "tests/unit/analytics-semantics-final-lock.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "2e91fea3b74d8c5e1122a1fe7acb475510e9019a",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "analytics-validation-semantics:ready:51",
      "sourceArtifact": "agent/state/analytics-validation-semantics.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-analytics-validation-semantics.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-analytics-validation-semantics.ts"
      ],
      "referencedPackageScript": "check:analytics-validation-semantics",
      "referencedTest": "tests/unit/analytics-validation-semantics.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "5c7d0dbd153160989cd96bca6702a87b5d00eeb9",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "auth-persistence-stability:current:52",
      "sourceArtifact": "agent/state/auth-persistence-stability.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-auth-persistence-stability.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-auth-persistence-stability.ts"
      ],
      "referencedPackageScript": "check:auth-persistence-stability",
      "referencedTest": "tests/unit/auth-persistence-stability.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "309d6b03",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "auth-provider-conflict-resolution:complete:53",
      "sourceArtifact": "agent/state/auth-provider-conflict-resolution.generated.json",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": "scripts/agent/validate-auth-provider-conflict-resolution.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-auth-provider-conflict-resolution.ts"
      ],
      "referencedPackageScript": "check:auth-provider-conflict-resolution",
      "referencedTest": "tests/unit/auth-provider-conflict-resolution.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "309d6b03",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "auth-provider-conflict-resolution:current:54",
      "sourceArtifact": "agent/state/auth-provider-conflict-resolution.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-auth-provider-conflict-resolution.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-auth-provider-conflict-resolution.ts"
      ],
      "referencedPackageScript": "check:auth-provider-conflict-resolution",
      "referencedTest": "tests/unit/auth-provider-conflict-resolution.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "309d6b03",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "auth-readiness-lock:pass:55",
      "sourceArtifact": "agent/state/auth-readiness-lock.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-auth-readiness-lock.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-auth-readiness-lock.ts"
      ],
      "referencedPackageScript": "check:auth-readiness-lock",
      "referencedTest": "tests/unit/auth-readiness-lock.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "3198b27d8499d675aa8e3ee98fe4e3368f2c77e0",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "auth-readiness-lock:locked:56",
      "sourceArtifact": "agent/state/auth-readiness-lock.generated.json",
      "claimText": "locked",
      "claimedStatus": "locked",
      "referencedValidator": "scripts/agent/validate-auth-readiness-lock.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-auth-readiness-lock.ts"
      ],
      "referencedPackageScript": "check:auth-readiness-lock",
      "referencedTest": "tests/unit/auth-readiness-lock.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "3198b27d8499d675aa8e3ee98fe4e3368f2c77e0",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "auth-readiness-lock:complete:57",
      "sourceArtifact": "agent/state/auth-readiness-lock.generated.json",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": "scripts/agent/validate-auth-readiness-lock.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-auth-readiness-lock.ts"
      ],
      "referencedPackageScript": "check:auth-readiness-lock",
      "referencedTest": "tests/unit/auth-readiness-lock.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "3198b27d8499d675aa8e3ee98fe4e3368f2c77e0",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "auth-readiness-lock:current:58",
      "sourceArtifact": "agent/state/auth-readiness-lock.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-auth-readiness-lock.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-auth-readiness-lock.ts"
      ],
      "referencedPackageScript": "check:auth-readiness-lock",
      "referencedTest": "tests/unit/auth-readiness-lock.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "3198b27d8499d675aa8e3ee98fe4e3368f2c77e0",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "auth-runtime-telemetry:pass:59",
      "sourceArtifact": "agent/state/auth-runtime-telemetry.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-auth-runtime-telemetry.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-auth-runtime-telemetry.ts"
      ],
      "referencedPackageScript": "check:auth-runtime-telemetry",
      "referencedTest": "tests/unit/auth-runtime-telemetry.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "309d6b03",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "auth-runtime-telemetry:current:60",
      "sourceArtifact": "agent/state/auth-runtime-telemetry.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-auth-runtime-telemetry.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-auth-runtime-telemetry.ts"
      ],
      "referencedPackageScript": "check:auth-runtime-telemetry",
      "referencedTest": "tests/unit/auth-runtime-telemetry.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "309d6b03",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "background-job-idempotency-audit:current:65",
      "sourceArtifact": "agent/state/background-job-idempotency-audit.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "behavior-math-status-cleanup:current:66",
      "sourceArtifact": "agent/state/behavior-math-status-cleanup.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-behavior-math-status-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-behavior-math-status-cleanup.ts"
      ],
      "referencedPackageScript": "check:behavior-math-status-cleanup",
      "referencedTest": "tests/unit/behavior-math-status-cleanup.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "4214aa6fca1f18201e8f09ed9197f38316b035c9",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "behavioral-extensibility-layer:pass:67",
      "sourceArtifact": "agent/state/behavioral-extensibility-layer.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-behavioral-extensibility-layer.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-behavioral-extensibility-layer.ts"
      ],
      "referencedPackageScript": "check:behavioral-extensibility-layer",
      "referencedTest": "tests/unit/behavioral-extensibility-layer.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "edd31cbee1e569fa059397c4782dd9f608c02fe9",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "behavioral-extensibility-layer:current:68",
      "sourceArtifact": "agent/state/behavioral-extensibility-layer.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-behavioral-extensibility-layer.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-behavioral-extensibility-layer.ts"
      ],
      "referencedPackageScript": "check:behavioral-extensibility-layer",
      "referencedTest": "tests/unit/behavioral-extensibility-layer.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "edd31cbee1e569fa059397c4782dd9f608c02fe9",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-evidence-gap-map:pass:69",
      "sourceArtifact": "agent/state/beta-evidence-gap-map.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-beta-evidence-gap-map.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-evidence-gap-map.ts"
      ],
      "referencedPackageScript": "check:beta-evidence-gap-map",
      "referencedTest": "tests/unit/beta-evidence-gap-map.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "2b2e19b60aff5bd93e0a9bde735793dad18dbe52",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-evidence-gap-map:ready:70",
      "sourceArtifact": "agent/state/beta-evidence-gap-map.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-beta-evidence-gap-map.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-evidence-gap-map.ts"
      ],
      "referencedPackageScript": "check:beta-evidence-gap-map",
      "referencedTest": "tests/unit/beta-evidence-gap-map.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "2b2e19b60aff5bd93e0a9bde735793dad18dbe52",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-evidence-gap-map:current:71",
      "sourceArtifact": "agent/state/beta-evidence-gap-map.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-beta-evidence-gap-map.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-evidence-gap-map.ts"
      ],
      "referencedPackageScript": "check:beta-evidence-gap-map",
      "referencedTest": "tests/unit/beta-evidence-gap-map.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "2b2e19b60aff5bd93e0a9bde735793dad18dbe52",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-evidence-gap-map:owner_review:72",
      "sourceArtifact": "agent/state/beta-evidence-gap-map.generated.json",
      "claimText": "owner_review",
      "claimedStatus": "owner_review",
      "referencedValidator": "scripts/agent/validate-beta-evidence-gap-map.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-evidence-gap-map.ts"
      ],
      "referencedPackageScript": "check:beta-evidence-gap-map",
      "referencedTest": "tests/unit/beta-evidence-gap-map.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "2b2e19b60aff5bd93e0a9bde735793dad18dbe52",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-evidence-lane-prep:ready:73",
      "sourceArtifact": "agent/state/beta-evidence-lane-prep.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-beta-evidence-lane-prep.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-evidence-lane-prep.ts"
      ],
      "referencedPackageScript": "check:beta-evidence-lane-prep",
      "referencedTest": "tests/unit/beta-evidence-lane-prep.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "2b2e19b60aff5bd93e0a9bde735793dad18dbe52",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-evidence-lane-prep:current:74",
      "sourceArtifact": "agent/state/beta-evidence-lane-prep.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-beta-evidence-lane-prep.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-evidence-lane-prep.ts"
      ],
      "referencedPackageScript": "check:beta-evidence-lane-prep",
      "referencedTest": "tests/unit/beta-evidence-lane-prep.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "2b2e19b60aff5bd93e0a9bde735793dad18dbe52",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-evidence-lane-prep:betaExitReady:76",
      "sourceArtifact": "agent/state/beta-evidence-lane-prep.generated.json",
      "claimText": "betaExitReady",
      "claimedStatus": "betaExitReady",
      "referencedValidator": "scripts/agent/validate-beta-evidence-lane-prep.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-evidence-lane-prep.ts"
      ],
      "referencedPackageScript": "check:beta-evidence-lane-prep",
      "referencedTest": "tests/unit/beta-evidence-lane-prep.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "2b2e19b60aff5bd93e0a9bde735793dad18dbe52",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-freshness-language:pass:77",
      "sourceArtifact": "agent/state/beta-freshness-language.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-beta-freshness-language.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-freshness-language.ts"
      ],
      "referencedPackageScript": "check:beta-freshness-language",
      "referencedTest": "tests/unit/beta-freshness-language.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "2b2e19b60aff5bd93e0a9bde735793dad18dbe52",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-freshness-language:current:78",
      "sourceArtifact": "agent/state/beta-freshness-language.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-beta-freshness-language.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-freshness-language.ts"
      ],
      "referencedPackageScript": "check:beta-freshness-language",
      "referencedTest": "tests/unit/beta-freshness-language.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "2b2e19b60aff5bd93e0a9bde735793dad18dbe52",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-health-algorithm-v2:pass:79",
      "sourceArtifact": "agent/state/beta-health-algorithm-v2.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-beta-health-algorithm-v2.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-health-algorithm-v2.ts"
      ],
      "referencedPackageScript": "check:beta-health-algorithm-v2",
      "referencedTest": "tests/unit/beta-health-algorithm-v2.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "1834e7481d4c0a87fa36f188e6a84548cc489a51",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-health-algorithm-v2:ready:80",
      "sourceArtifact": "agent/state/beta-health-algorithm-v2.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-beta-health-algorithm-v2.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-health-algorithm-v2.ts"
      ],
      "referencedPackageScript": "check:beta-health-algorithm-v2",
      "referencedTest": "tests/unit/beta-health-algorithm-v2.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "1834e7481d4c0a87fa36f188e6a84548cc489a51",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-score-cleanup:pass:81",
      "sourceArtifact": "agent/state/beta-score-cleanup.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-beta-score-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-score-cleanup.ts"
      ],
      "referencedPackageScript": "check:beta-score-cleanup",
      "referencedTest": "tests/unit/beta-score-cleanup.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "70919f6be9129ce71ecc8b8f88eeafec9f866b5f",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-score-cleanup:current:82",
      "sourceArtifact": "agent/state/beta-score-cleanup.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-beta-score-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-score-cleanup.ts"
      ],
      "referencedPackageScript": "check:beta-score-cleanup",
      "referencedTest": "tests/unit/beta-score-cleanup.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "70919f6be9129ce71ecc8b8f88eeafec9f866b5f",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "beta-score-cleanup:cost_review_required:83",
      "sourceArtifact": "agent/state/beta-score-cleanup.generated.json",
      "claimText": "cost_review_required",
      "claimedStatus": "cost_review_required",
      "referencedValidator": "scripts/agent/validate-beta-score-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-beta-score-cleanup.ts"
      ],
      "referencedPackageScript": "check:beta-score-cleanup",
      "referencedTest": "tests/unit/beta-score-cleanup.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "70919f6be9129ce71ecc8b8f88eeafec9f866b5f",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "billing-spike-radar:pass:84",
      "sourceArtifact": "agent/state/billing-spike-radar.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "billing-spike-radar:complete:85",
      "sourceArtifact": "agent/state/billing-spike-radar.generated.json",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "blocked-refresh-queue-resolver:pass:86",
      "sourceArtifact": "agent/state/blocked-refresh-queue-resolver.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-blocked-refresh-queue-resolver.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-blocked-refresh-queue-resolver.ts"
      ],
      "referencedPackageScript": "check:blocked-refresh-queue-resolver",
      "referencedTest": "tests/unit/blocked-refresh-queue-resolver.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "f77a5c417449e51c3ec56b14fcaeef2ac546f95c",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "blocked-refresh-queue-resolver:current:87",
      "sourceArtifact": "agent/state/blocked-refresh-queue-resolver.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-blocked-refresh-queue-resolver.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-blocked-refresh-queue-resolver.ts"
      ],
      "referencedPackageScript": "check:blocked-refresh-queue-resolver",
      "referencedTest": "tests/unit/blocked-refresh-queue-resolver.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "f77a5c417449e51c3ec56b14fcaeef2ac546f95c",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "body-system-wiring-repair:pass:88",
      "sourceArtifact": "agent/state/body-system-wiring-repair.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-body-system-wiring-repair.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-body-system-wiring-repair.ts"
      ],
      "referencedPackageScript": "check:body-system-wiring-repair",
      "referencedTest": "tests/unit/body-system-wiring-repair.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "a74f489c81e605f1c9a280f28726d352fcb54dee",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "body-system-wiring-repair:ready:89",
      "sourceArtifact": "agent/state/body-system-wiring-repair.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-body-system-wiring-repair.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-body-system-wiring-repair.ts"
      ],
      "referencedPackageScript": "check:body-system-wiring-repair",
      "referencedTest": "tests/unit/body-system-wiring-repair.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "a74f489c81e605f1c9a280f28726d352fcb54dee",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "body-system-wiring-repair:current:90",
      "sourceArtifact": "agent/state/body-system-wiring-repair.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-body-system-wiring-repair.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-body-system-wiring-repair.ts"
      ],
      "referencedPackageScript": "check:body-system-wiring-repair",
      "referencedTest": "tests/unit/body-system-wiring-repair.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "a74f489c81e605f1c9a280f28726d352fcb54dee",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "bug-report-truth-source-cleanup:current:91",
      "sourceArtifact": "agent/state/bug-report-truth-source-cleanup.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-bug-report-truth-source-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-bug-report-truth-source-cleanup.ts"
      ],
      "referencedPackageScript": "check:bug-report-truth-source-cleanup",
      "referencedTest": "tests/unit/bug-report-truth-source-cleanup.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "5c7d0dbd153160989cd96bca6702a87b5d00eeb9",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "canonical-math-authority-ledger:pass:92",
      "sourceArtifact": "agent/state/canonical-math-authority-ledger.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-canonical-math-authority-ledger.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-canonical-math-authority-ledger.ts"
      ],
      "referencedPackageScript": "check:canonical-math-authority-ledger",
      "referencedTest": "tests/unit/canonical-math-authority-ledger.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d8cab39150662e8600c129d90d931b812256ab77",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "canonical-math-authority-ledger:ready:93",
      "sourceArtifact": "agent/state/canonical-math-authority-ledger.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-canonical-math-authority-ledger.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-canonical-math-authority-ledger.ts"
      ],
      "referencedPackageScript": "check:canonical-math-authority-ledger",
      "referencedTest": "tests/unit/canonical-math-authority-ledger.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d8cab39150662e8600c129d90d931b812256ab77",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "canonical-math-authority-ledger:complete:94",
      "sourceArtifact": "agent/state/canonical-math-authority-ledger.generated.json",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": "scripts/agent/validate-canonical-math-authority-ledger.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-canonical-math-authority-ledger.ts"
      ],
      "referencedPackageScript": "check:canonical-math-authority-ledger",
      "referencedTest": "tests/unit/canonical-math-authority-ledger.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d8cab39150662e8600c129d90d931b812256ab77",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "canonical-math-authority-ledger:current:95",
      "sourceArtifact": "agent/state/canonical-math-authority-ledger.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-canonical-math-authority-ledger.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-canonical-math-authority-ledger.ts"
      ],
      "referencedPackageScript": "check:canonical-math-authority-ledger",
      "referencedTest": "tests/unit/canonical-math-authority-ledger.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d8cab39150662e8600c129d90d931b812256ab77",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "canonical-math-ledger:pass:96",
      "sourceArtifact": "agent/state/canonical-math-ledger.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-canonical-math-ledger.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-canonical-math-ledger.ts"
      ],
      "referencedPackageScript": "check:canonical-math-ledger",
      "referencedTest": "tests/unit/canonical-math-ledger.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "34f63bc34ed85473191110bc6084e1dbbead4d2a",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "central-normalizer-spine:pass:97",
      "sourceArtifact": "agent/state/central-normalizer-spine.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-central-normalizer-spine.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-central-normalizer-spine.ts"
      ],
      "referencedPackageScript": "check:central-normalizer-spine",
      "referencedTest": "tests/unit/central-normalizer-spine.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "a74f489c81e605f1c9a280f28726d352fcb54dee",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "central-normalizer-spine:current:98",
      "sourceArtifact": "agent/state/central-normalizer-spine.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-central-normalizer-spine.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-central-normalizer-spine.ts"
      ],
      "referencedPackageScript": "check:central-normalizer-spine",
      "referencedTest": "tests/unit/central-normalizer-spine.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "a74f489c81e605f1c9a280f28726d352fcb54dee",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chat-composer-modal-lift:pass:99",
      "sourceArtifact": "agent/state/chat-composer-modal-lift.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-chat-composer-modal-lift.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-chat-composer-modal-lift.ts"
      ],
      "referencedPackageScript": "check:chat-composer-modal-lift",
      "referencedTest": "tests/unit/chat-composer-modal-lift.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "58929a769685124b73004b07f1795ec1dd0dd45f",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chat-functionality-score-lock:pass:100",
      "sourceArtifact": "agent/state/chat-functionality-score-lock.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-chat-functionality-score-lock.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-chat-functionality-score-lock.ts"
      ],
      "referencedPackageScript": "check:chat-functionality-score-lock",
      "referencedTest": "tests/unit/chat-functionality-score-lock.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d02b8b2da859d47d880182fe2169db1ad6a40ad6",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chat-gating-moderation:ready:101",
      "sourceArtifact": "agent/state/chat-gating-moderation.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-chat-gating-moderation.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-chat-gating-moderation.ts"
      ],
      "referencedPackageScript": "check:chat-gating-moderation",
      "referencedTest": "tests/unit/chat-gating-moderation.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d02b8b2da859d47d880182fe2169db1ad6a40ad6",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chat-presence-typing:pass:102",
      "sourceArtifact": "agent/state/chat-presence-typing.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-chat-presence-typing.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-chat-presence-typing.ts"
      ],
      "referencedPackageScript": "check:chat-presence-typing",
      "referencedTest": "tests/unit/chat-presence-typing.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "7a7ad97d75695ba776d2fe2b5f2e82dfdfd8e482",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chat-presence-typing:current:103",
      "sourceArtifact": "agent/state/chat-presence-typing.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-chat-presence-typing.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-chat-presence-typing.ts"
      ],
      "referencedPackageScript": "check:chat-presence-typing",
      "referencedTest": "tests/unit/chat-presence-typing.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "7a7ad97d75695ba776d2fe2b5f2e82dfdfd8e482",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chat-realtime-cost-control:ready:104",
      "sourceArtifact": "agent/state/chat-realtime-cost-control.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-chat-realtime-cost-control.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-chat-realtime-cost-control.ts"
      ],
      "referencedPackageScript": "check:chat-realtime-cost-control",
      "referencedTest": "tests/unit/chat-realtime-cost-control.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "7a7ad97d75695ba776d2fe2b5f2e82dfdfd8e482",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chat-realtime-cost-control:current:105",
      "sourceArtifact": "agent/state/chat-realtime-cost-control.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-chat-realtime-cost-control.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-chat-realtime-cost-control.ts"
      ],
      "referencedPackageScript": "check:chat-realtime-cost-control",
      "referencedTest": "tests/unit/chat-realtime-cost-control.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "7a7ad97d75695ba776d2fe2b5f2e82dfdfd8e482",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chat-realtime-cost-control:source_ready:106",
      "sourceArtifact": "agent/state/chat-realtime-cost-control.generated.json",
      "claimText": "source_ready",
      "claimedStatus": "source_ready",
      "referencedValidator": "scripts/agent/validate-chat-realtime-cost-control.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-chat-realtime-cost-control.ts"
      ],
      "referencedPackageScript": "check:chat-realtime-cost-control",
      "referencedTest": "tests/unit/chat-realtime-cost-control.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "7a7ad97d75695ba776d2fe2b5f2e82dfdfd8e482",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "chat-route-cohort-runtime:current:107",
      "sourceArtifact": "agent/state/chat-route-cohort-runtime.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-chat-route-cohort-runtime.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-chat-route-cohort-runtime.ts"
      ],
      "referencedPackageScript": "check:chat-route-cohort-runtime",
      "referencedTest": "tests/unit/chat-route-cohort-runtime.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "client-loading-speed:pass:112",
      "sourceArtifact": "agent/state/client-loading-speed.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-client-loading-speed.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-client-loading-speed.ts"
      ],
      "referencedPackageScript": "check:client-loading-speed",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cloud-sql-gemini-cost-guards:pass:113",
      "sourceArtifact": "agent/state/cloud-sql-gemini-cost-guards.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-cloud-sql-gemini-cost-guards.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-cloud-sql-gemini-cost-guards.ts"
      ],
      "referencedPackageScript": "check:cloud-sql-gemini-cost-guards",
      "referencedTest": "tests/unit/cloud-sql-gemini-cost-guards.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "8a062a92bdd8a0f6a2d39e32bc6033498cda5d9a",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cloudrun-sql-bigquery-guardrails:pass:114",
      "sourceArtifact": "agent/state/cloudrun-sql-bigquery-guardrails.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "code-organization-score:locked:115",
      "sourceArtifact": "agent/state/code-organization-score.generated.json",
      "claimText": "locked",
      "claimedStatus": "locked",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "code-organization-score:current:116",
      "sourceArtifact": "agent/state/code-organization-score.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "codebase-hardening:locked:117",
      "sourceArtifact": "agent/state/codebase-hardening.generated.json",
      "claimText": "locked",
      "claimedStatus": "locked",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "codebase-hardening:complete:118",
      "sourceArtifact": "agent/state/codebase-hardening.generated.json",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "codebase-hardening:current:119",
      "sourceArtifact": "agent/state/codebase-hardening.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "codebase-junk-cleanup:pass:120",
      "sourceArtifact": "agent/state/codebase-junk-cleanup.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-codebase-junk-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-codebase-junk-cleanup.ts"
      ],
      "referencedPackageScript": "check:codebase-junk-cleanup",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "codebase-junk-cleanup:locked:121",
      "sourceArtifact": "agent/state/codebase-junk-cleanup.generated.json",
      "claimText": "locked",
      "claimedStatus": "locked",
      "referencedValidator": "scripts/agent/validate-codebase-junk-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-codebase-junk-cleanup.ts"
      ],
      "referencedPackageScript": "check:codebase-junk-cleanup",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "codebase-junk-cleanup:complete:122",
      "sourceArtifact": "agent/state/codebase-junk-cleanup.generated.json",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": "scripts/agent/validate-codebase-junk-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-codebase-junk-cleanup.ts"
      ],
      "referencedPackageScript": "check:codebase-junk-cleanup",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "codebase-organization-hardening:pass:123",
      "sourceArtifact": "agent/state/codebase-organization-hardening.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-codebase-organization-hardening.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-codebase-organization-hardening.ts"
      ],
      "referencedPackageScript": "check:codebase-organization-hardening",
      "referencedTest": "tests/unit/codebase-organization-hardening.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "codebase-organization-hardening:current:124",
      "sourceArtifact": "agent/state/codebase-organization-hardening.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-codebase-organization-hardening.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-codebase-organization-hardening.ts"
      ],
      "referencedPackageScript": "check:codebase-organization-hardening",
      "referencedTest": "tests/unit/codebase-organization-hardening.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "codex-execution-guardrails:pass:125",
      "sourceArtifact": "agent/state/codex-execution-guardrails.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "commerce-parity-validator-semantics:pass:126",
      "sourceArtifact": "agent/state/commerce-parity-validator-semantics.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-commerce-parity-validator-semantics.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-commerce-parity-validator-semantics.ts"
      ],
      "referencedPackageScript": "check:commerce-parity-validator-semantics",
      "referencedTest": "tests/unit/commerce-parity-validator-semantics.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "commerce-rollup-reconciliation:pass:127",
      "sourceArtifact": "agent/state/commerce-rollup-reconciliation.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-commerce-rollup-reconciliation.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-commerce-rollup-reconciliation.ts"
      ],
      "referencedPackageScript": "check:commerce-rollup-reconciliation",
      "referencedTest": "tests/unit/commerce-rollup-reconciliation.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "complete-dependency-inventory:pass:128",
      "sourceArtifact": "agent/state/complete-dependency-inventory.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-complete-dependency-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-complete-dependency-inventory.ts"
      ],
      "referencedPackageScript": "check:complete-dependency-inventory",
      "referencedTest": "tests/unit/complete-dependency-inventory.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "complete-dependency-inventory:complete:129",
      "sourceArtifact": "agent/state/complete-dependency-inventory.generated.json",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": "scripts/agent/validate-complete-dependency-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-complete-dependency-inventory.ts"
      ],
      "referencedPackageScript": "check:complete-dependency-inventory",
      "referencedTest": "tests/unit/complete-dependency-inventory.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "complete-dependency-inventory:current:130",
      "sourceArtifact": "agent/state/complete-dependency-inventory.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-complete-dependency-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-complete-dependency-inventory.ts"
      ],
      "referencedPackageScript": "check:complete-dependency-inventory",
      "referencedTest": "tests/unit/complete-dependency-inventory.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "config-runtime-sample-status-classifier:current:131",
      "sourceArtifact": "agent/state/config-runtime-sample-status-classifier.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-config-runtime-sample-status-classifier.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-config-runtime-sample-status-classifier.ts"
      ],
      "referencedPackageScript": "check:config-runtime-sample-status-classifier",
      "referencedTest": "tests/unit/config-runtime-sample-status-classifier.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d02b8b2da859d47d880182fe2169db1ad6a40ad6",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "consent-tracking-contract:pass:132",
      "sourceArtifact": "agent/state/consent-tracking-contract.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-consent-tracking-contract.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-consent-tracking-contract.ts"
      ],
      "referencedPackageScript": "check:consent-tracking-contract",
      "referencedTest": "tests/unit/consent-tracking-contract.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "edd31cbee1e569fa059397c4782dd9f608c02fe9",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "consent-tracking-mode-cleanup:source_ready:133",
      "sourceArtifact": "agent/state/consent-tracking-mode-cleanup.generated.json",
      "claimText": "source_ready",
      "claimedStatus": "source_ready",
      "referencedValidator": "scripts/agent/validate-consent-tracking-mode-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-consent-tracking-mode-cleanup.ts"
      ],
      "referencedPackageScript": "check:consent-tracking-mode-cleanup",
      "referencedTest": "tests/unit/consent-tracking-mode-cleanup.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "4214aa6fca1f18201e8f09ed9197f38316b035c9",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "content-media-pipeline-audit:current:134",
      "sourceArtifact": "agent/state/content-media-pipeline-audit.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "content-protection-score:locked:135",
      "sourceArtifact": "agent/state/content-protection-score.generated.json",
      "claimText": "locked",
      "claimedStatus": "locked",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "control-tower-report-freshness-cleanup:current:136",
      "sourceArtifact": "agent/state/control-tower-report-freshness-cleanup.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-control-tower-report-freshness-cleanup.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-control-tower-report-freshness-cleanup.ts"
      ],
      "referencedPackageScript": "check:control-tower-report-freshness-cleanup",
      "referencedTest": "tests/unit/control-tower-report-freshness-cleanup.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "5c126a7df36e39be20ab55b40ce5d14c04779fb5",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cookie-banner-settings-sync:pass:137",
      "sourceArtifact": "agent/state/cookie-banner-settings-sync.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-cookie-banner-settings-sync.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-cookie-banner-settings-sync.ts"
      ],
      "referencedPackageScript": "check:cookie-banner-settings-sync",
      "referencedTest": "tests/unit/cookie-banner-settings-sync.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "edd31cbee1e569fa059397c4782dd9f608c02fe9",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cost-4xx-reduction:pass:138",
      "sourceArtifact": "agent/state/cost-4xx-reduction.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-cost-4xx-reduction.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-cost-4xx-reduction.ts"
      ],
      "referencedPackageScript": "check:cost-4xx-reduction",
      "referencedTest": "tests/unit/cost-4xx-reduction.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "3878a581193dd171f69e3c0b63073ac738c14152",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cost-accuracy-hardening:source_ready:139",
      "sourceArtifact": "agent/state/cost-accuracy-hardening.generated.json",
      "claimText": "source_ready",
      "claimedStatus": "source_ready",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cost-data-connect-refresh:pass:140",
      "sourceArtifact": "agent/state/cost-data-connect-refresh.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-cost-data-connect-refresh.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-cost-data-connect-refresh.ts"
      ],
      "referencedPackageScript": "check:cost-data-connect-refresh",
      "referencedTest": "tests/unit/cost-data-connect-refresh.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "afdc394d07b0dd0ea93aae14ae32bc47886165d9",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cost-export-sql-parity-math:pass:141",
      "sourceArtifact": "agent/state/cost-export-sql-parity-math.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-cost-export-sql-parity-math.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-cost-export-sql-parity-math.ts"
      ],
      "referencedPackageScript": "check:cost-export-sql-parity-math",
      "referencedTest": "tests/unit/cost-export-sql-parity-math.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "14264ff8",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cost-owner-review-source-closure:pass:142",
      "sourceArtifact": "agent/state/cost-owner-review-source-closure.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-cost-owner-review-source-closure.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-cost-owner-review-source-closure.ts"
      ],
      "referencedPackageScript": "check:cost-owner-review-source-closure",
      "referencedTest": "tests/unit/cost-owner-review-source-closure.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "3878a581193dd171f69e3c0b63073ac738c14152",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cost-owner-review-source-closure:current:143",
      "sourceArtifact": "agent/state/cost-owner-review-source-closure.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-cost-owner-review-source-closure.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-cost-owner-review-source-closure.ts"
      ],
      "referencedPackageScript": "check:cost-owner-review-source-closure",
      "referencedTest": "tests/unit/cost-owner-review-source-closure.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "3878a581193dd171f69e3c0b63073ac738c14152",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cost-owner-review-source-closure:cost_review_required:144",
      "sourceArtifact": "agent/state/cost-owner-review-source-closure.generated.json",
      "claimText": "cost_review_required",
      "claimedStatus": "cost_review_required",
      "referencedValidator": "scripts/agent/validate-cost-owner-review-source-closure.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-cost-owner-review-source-closure.ts"
      ],
      "referencedPackageScript": "check:cost-owner-review-source-closure",
      "referencedTest": "tests/unit/cost-owner-review-source-closure.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "3878a581193dd171f69e3c0b63073ac738c14152",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cost-risk-exit-pass:pass:145",
      "sourceArtifact": "agent/state/cost-risk-exit-pass.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-cost-risk-exit-pass.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-cost-risk-exit-pass.ts"
      ],
      "referencedPackageScript": "check:cost-risk-exit-pass",
      "referencedTest": "tests/unit/cost-risk-exit-pass.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "a81cdb0b885f65dec63a582e4b9fe4cfdfeced39",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cost-risk-exit-pass:cost_review_required:146",
      "sourceArtifact": "agent/state/cost-risk-exit-pass.generated.json",
      "claimText": "cost_review_required",
      "claimedStatus": "cost_review_required",
      "referencedValidator": "scripts/agent/validate-cost-risk-exit-pass.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-cost-risk-exit-pass.ts"
      ],
      "referencedPackageScript": "check:cost-risk-exit-pass",
      "referencedTest": "tests/unit/cost-risk-exit-pass.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "a81cdb0b885f65dec63a582e4b9fe4cfdfeced39",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cost-risk-owner-review-closure:pass:147",
      "sourceArtifact": "agent/state/cost-risk-owner-review-closure.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-cost-risk-owner-review-closure.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-cost-risk-owner-review-closure.ts"
      ],
      "referencedPackageScript": "check:cost-risk-owner-review-closure",
      "referencedTest": "tests/unit/cost-risk-owner-review-closure.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d1f8e2fb4435ad131c8fc7cc85debe027a31346a",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cost-risk-owner-review-closure:current:148",
      "sourceArtifact": "agent/state/cost-risk-owner-review-closure.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-cost-risk-owner-review-closure.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-cost-risk-owner-review-closure.ts"
      ],
      "referencedPackageScript": "check:cost-risk-owner-review-closure",
      "referencedTest": "tests/unit/cost-risk-owner-review-closure.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d1f8e2fb4435ad131c8fc7cc85debe027a31346a",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "cost-risk-owner-review-closure:cost_review_required:149",
      "sourceArtifact": "agent/state/cost-risk-owner-review-closure.generated.json",
      "claimText": "cost_review_required",
      "claimedStatus": "cost_review_required",
      "referencedValidator": "scripts/agent/validate-cost-risk-owner-review-closure.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-cost-risk-owner-review-closure.ts"
      ],
      "referencedPackageScript": "check:cost-risk-owner-review-closure",
      "referencedTest": "tests/unit/cost-risk-owner-review-closure.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d1f8e2fb4435ad131c8fc7cc85debe027a31346a",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "count-deduplication-normalization:pass:150",
      "sourceArtifact": "agent/state/count-deduplication-normalization.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-count-deduplication-normalization.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-count-deduplication-normalization.ts"
      ],
      "referencedPackageScript": "check:count-deduplication-normalization",
      "referencedTest": "tests/unit/count-deduplication-normalization.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "884fd150a5062368df5ffcfd642484a7a2360b60",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-broadcast-timeline-prep:pass:151",
      "sourceArtifact": "agent/state/creator-broadcast-timeline-prep.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-creator-broadcast-timeline-prep.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-broadcast-timeline-prep.ts"
      ],
      "referencedPackageScript": "check:creator-broadcast-timeline-prep",
      "referencedTest": "tests/unit/creator-broadcast-timeline-prep.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "080ebb115fc9d917f52b2e38108634821a2712ce",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-dashboard-error-cost-inventory:pass:152",
      "sourceArtifact": "agent/state/creator-dashboard-error-cost-inventory.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-creator-dashboard-error-cost-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-dashboard-error-cost-inventory.ts"
      ],
      "referencedPackageScript": "check:creator-dashboard-error-cost-inventory",
      "referencedTest": "tests/unit/creator-dashboard-error-cost-inventory.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d8cde44345b6f0a6f0dd8710ff063356d74a5791",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-dashboard-error-cost-inventory:owner_review:153",
      "sourceArtifact": "agent/state/creator-dashboard-error-cost-inventory.generated.json",
      "claimText": "owner_review",
      "claimedStatus": "owner_review",
      "referencedValidator": "scripts/agent/validate-creator-dashboard-error-cost-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-dashboard-error-cost-inventory.ts"
      ],
      "referencedPackageScript": "check:creator-dashboard-error-cost-inventory",
      "referencedTest": "tests/unit/creator-dashboard-error-cost-inventory.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "d8cde44345b6f0a6f0dd8710ff063356d74a5791",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-dashboard-projection-lock:pass:154",
      "sourceArtifact": "agent/state/creator-dashboard-projection-lock.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-creator-dashboard-projection-lock.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-dashboard-projection-lock.ts"
      ],
      "referencedPackageScript": "check:creator-dashboard-projection-lock",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-discovery-relationship-funnel:pass:155",
      "sourceArtifact": "agent/state/creator-discovery-relationship-funnel.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-creator-discovery-relationship-funnel.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-discovery-relationship-funnel.ts"
      ],
      "referencedPackageScript": "check:creator-discovery-relationship-funnel",
      "referencedTest": "tests/unit/creator-discovery-relationship-funnel.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "e0c0b9d5d6e30325fe638cff479d766a263ef585",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-drop-status-metrics:ready:156",
      "sourceArtifact": "agent/state/creator-drop-status-metrics.generated.json",
      "claimText": "ready",
      "claimedStatus": "ready",
      "referencedValidator": "scripts/agent/validate-creator-drop-status-metrics.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-drop-status-metrics.ts"
      ],
      "referencedPackageScript": "check:creator-drop-status-metrics",
      "referencedTest": "tests/unit/creator-drop-status-metrics.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "2b2e19b60aff5bd93e0a9bde735793dad18dbe52",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-experience-simplification:pass:157",
      "sourceArtifact": "agent/state/creator-experience-simplification.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-creator-experience-simplification.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-experience-simplification.ts"
      ],
      "referencedPackageScript": "check:creator-experience-simplification",
      "referencedTest": "tests/unit/creator-experience-simplification.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "e75d98523cda258032a04e11eb16e1d128bea2f9",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-fan-pass-crm-broadcast:pass:158",
      "sourceArtifact": "agent/state/creator-fan-pass-crm-broadcast.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-creator-fan-pass-crm-broadcast.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-fan-pass-crm-broadcast.ts"
      ],
      "referencedPackageScript": "check:creator-fan-pass-crm-broadcast",
      "referencedTest": "tests/unit/creator-fan-pass-crm-broadcast.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "7c61feaf8898924149f1cde5dc11278782ef8b9d",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-lane-legacy-truth-inventory:pass:159",
      "sourceArtifact": "agent/state/creator-lane-legacy-truth-inventory.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-creator-lane-legacy-truth-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-lane-legacy-truth-inventory.ts"
      ],
      "referencedPackageScript": "check:creator-lane-legacy-truth-inventory",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "afdc394d07b0dd0ea93aae14ae32bc47886165d9",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-lane-legacy-truth-inventory:complete:160",
      "sourceArtifact": "agent/state/creator-lane-legacy-truth-inventory.generated.json",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": "scripts/agent/validate-creator-lane-legacy-truth-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-lane-legacy-truth-inventory.ts"
      ],
      "referencedPackageScript": "check:creator-lane-legacy-truth-inventory",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "afdc394d07b0dd0ea93aae14ae32bc47886165d9",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-lane-legacy-truth-inventory:current:161",
      "sourceArtifact": "agent/state/creator-lane-legacy-truth-inventory.generated.json",
      "claimText": "current",
      "claimedStatus": "current",
      "referencedValidator": "scripts/agent/validate-creator-lane-legacy-truth-inventory.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-lane-legacy-truth-inventory.ts"
      ],
      "referencedPackageScript": "check:creator-lane-legacy-truth-inventory",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "afdc394d07b0dd0ea93aae14ae32bc47886165d9",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-lane-old-logic-cleanup:complete:162",
      "sourceArtifact": "agent/state/creator-lane-old-logic-cleanup.generated.json",
      "claimText": "complete",
      "claimedStatus": "complete",
      "referencedValidator": null,
      "referencedSourceFiles": [],
      "referencedPackageScript": null,
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-monetization-admin-debug:pass:163",
      "sourceArtifact": "agent/state/creator-monetization-admin-debug.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-creator-monetization-admin-debug.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-monetization-admin-debug.ts"
      ],
      "referencedPackageScript": "check:creator-monetization-admin-debug",
      "referencedTest": "tests/unit/creator-monetization-admin-debug.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "1e7a3bc6",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-monetization-gates-lock:pass:164",
      "sourceArtifact": "agent/state/creator-monetization-gates-lock.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-creator-monetization-gates-lock.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-monetization-gates-lock.ts"
      ],
      "referencedPackageScript": "check:creator-monetization-gates-lock",
      "referencedTest": null,
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": null,
      "proofStatus": "stale",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-monetization-readiness-lock:pass:165",
      "sourceArtifact": "agent/state/creator-monetization-readiness-lock.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-creator-monetization-readiness-lock.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-monetization-readiness-lock.ts"
      ],
      "referencedPackageScript": "check:creator-monetization-readiness-lock",
      "referencedTest": "tests/unit/creator-monetization-readiness-lock.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "79ad1387",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-monetization-settings-truth:pass:166",
      "sourceArtifact": "agent/state/creator-monetization-settings-truth.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-creator-monetization-settings-truth.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-monetization-settings-truth.ts"
      ],
      "referencedPackageScript": "check:creator-monetization-settings-truth",
      "referencedTest": "tests/unit/creator-monetization-settings-truth.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "1bac904e",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-nav-role-consolidation:pass:167",
      "sourceArtifact": "agent/state/creator-nav-role-consolidation.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-creator-nav-role-consolidation.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-nav-role-consolidation.ts"
      ],
      "referencedPackageScript": "check:creator-nav-role-consolidation",
      "referencedTest": "tests/unit/creator-nav-role-consolidation.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "dc3ae97ac8edaba50669b0188a12e9f7fa4774f6",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-nav-role-consolidation:locked:168",
      "sourceArtifact": "agent/state/creator-nav-role-consolidation.generated.json",
      "claimText": "locked",
      "claimedStatus": "locked",
      "referencedValidator": "scripts/agent/validate-creator-nav-role-consolidation.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-nav-role-consolidation.ts"
      ],
      "referencedPackageScript": "check:creator-nav-role-consolidation",
      "referencedTest": "tests/unit/creator-nav-role-consolidation.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "dc3ae97ac8edaba50669b0188a12e9f7fa4774f6",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    },
    {
      "claimId": "creator-pricing-wiring:pass:169",
      "sourceArtifact": "agent/state/creator-pricing-wiring.generated.json",
      "claimText": "pass",
      "claimedStatus": "pass",
      "referencedValidator": "scripts/agent/validate-creator-pricing-wiring.ts",
      "referencedSourceFiles": [
        "scripts/agent/validate-creator-pricing-wiring.ts"
      ],
      "referencedPackageScript": "check:creator-pricing-wiring",
      "referencedTest": "tests/unit/creator-pricing-wiring.spec.ts",
      "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "artifactHead": "42bdd44bf02066df05ab2b18dc351681fc93d1cf",
      "proofStatus": "head_mismatch",
      "contradictionFound": false,
      "exactNextAction": "Refresh or wire the referenced validator, package script, test, source, and artifact."
    }
  ],
  "validationFailures": []
}
```

## Validation

- Pass.
