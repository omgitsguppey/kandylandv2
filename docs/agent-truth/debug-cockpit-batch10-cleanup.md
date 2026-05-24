# Debug Cockpit Batch10 Cleanup

Generated source-only Batch 10 evidence. No production reads, deploys, provider calls, payment runtime changes, or GumDrop math changes were performed.

```json
{
  "generatedAtUtc": "2026-05-24T18:45:41.970Z",
  "reportKey": "debug-cockpit-batch10-cleanup",
  "betaScoreHeadBefore": "a54fc24ccc1ad7b3d23c7aa2a6b3c5bb354fde76",
  "betaScoreHeadAfter": "e0b2faccf8604728ef1ba7efbcac53c3722049ad",
  "repoHead": "e0b2faccf8604728ef1ba7efbcac53c3722049ad",
  "selfHealingAgeBefore": 406694.6,
  "selfHealingAgeAfter": 0.11,
  "speedSecurityScoreBefore": 51,
  "speedSecurityScoreAfter": 51,
  "speedSecurityFindingsBefore": 177,
  "speedSecurityFindingsAfter": 86,
  "speedSecurityAgeAfter": 0.12,
  "hardeningScoreBefore": 97,
  "hardeningScoreAfter": 94,
  "hardeningFindingsBefore": 6,
  "hardeningFindingsAfter": 6,
  "hardeningAgeAfter": 0.11,
  "adminBalanceBodyCapStatus": "bounded_parser_cap_8192",
  "creatorAccountControlsBodyCapStatus": "bounded_parser_cap_16384",
  "creatorAccountControlsTypedErrorsStatus": "typed_safe_error_mapping",
  "creatorAgreementsTypedErrorsStatus": "typed_safe_error_mapping",
  "viewerEntitlementStatus": "entitlement_evidence_current",
  "aiBudgetGuardStatus": "ai_budget_guard_current",
  "boundedParserUsed": "readBoundedJsonBody",
  "touchedPaymentRuntime": false,
  "gumdropMathChanged": false,
  "providerCallsRun": false,
  "productionReadsRun": false,
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
  "remainingFindings": [],
  "dirtyFilesClassified": [
    {
      "file": "HANGELOG.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "agent/context/optimized-task-context.generated.json",
      "classification": "source_security_fix_required"
    },
    {
      "file": "agent/state/admin-balance-body-cap.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/codebase-hardening.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/current-beta-exit-status.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/overnight-beta-readiness-lock.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/public-beta-score.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/self-healing-refresh-queue.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/speed-security-hardening.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "docs/agent-truth/admin-balance-body-cap.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/current-beta-exit-status.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/overnight-beta-readiness-lock.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/self-healing-refresh-queue.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "package.json",
      "classification": "source_security_fix_required"
    },
    {
      "file": "public/kandydrops-release-notes.json",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/creator-account-controls/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/creator-agreements/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/dashboard/viewer/page.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/ai-debug-assistant.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/release-notes/public-release-notes.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/release-notes/release-version-contract.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/server/ai-debug-assistant.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-creator-account-controls-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-creator-agreements-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "agent/state/ai-debug-budget-guard.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/debug-cockpit-batch10-cleanup.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/viewer-entitlement-hardening.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "docs/agent-truth/ai-debug-budget-guard.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/debug-cockpit-batch10-cleanup.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/viewer-entitlement-hardening.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/debug-cockpit-batch10-shared.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-ai-debug-budget-guard.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-debug-cockpit-batch10-cleanup.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-viewer-entitlement-hardening.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/server/admin-route-errors.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/server/ai-debug-budget-guard.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/server/viewer-drop-entitlement.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/ai-debug-budget-guard.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/debug-cockpit-batch10-cleanup.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/viewer-entitlement-hardening.spec.ts",
      "classification": "source_security_fix_required"
    }
  ],
  "nextExactSteps": [
    "Refresh beta, speed/security, hardening, and self-healing reports after this source patch.",
    "Attach formal provider/runtime/admin evidence separately; no formal gate was cleared by this batch."
  ],
  "validationFailures": []
}
```
