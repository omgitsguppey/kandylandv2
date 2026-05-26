# codebase organization hardening

Source-only hardening artifact. It does not run production reads, provider calls, exports, deploys, or mutate legacy/production data.

```json
{
  "reportKey": "codebase-organization-hardening",
  "generatedAtUtc": "2026-05-26T12:24:12.748Z",
  "status": "pass",
  "productionReadsPerformed": false,
  "providerCallsPerformed": false,
  "deployPerformed": false,
  "rules": [
    {
      "ruleId": "feature-body-system-required",
      "subject": "new feature or route",
      "requiredFields": [
        "bodySystem",
        "featureId",
        "surfaceId",
        "routeOrApiRoute"
      ],
      "validator": "check:product-body-map",
      "reason": "Every visible limb needs one body system and canonical registry owner."
    },
    {
      "ruleId": "telemetry-event-envelope-required",
      "subject": "new telemetry event",
      "requiredFields": [
        "eventName",
        "eventEnvelope",
        "normalizerPath",
        "privacyClass"
      ],
      "validator": "check:event-translation-bridge",
      "reason": "Telemetry must not bypass envelope, consent, identity, and source truth."
    },
    {
      "ruleId": "metric-math-owner-required",
      "subject": "new metric",
      "requiredFields": [
        "metricId",
        "formulaOwner",
        "confidence",
        "freshness",
        "sourceTruth"
      ],
      "validator": "check:canonical-math-ledger",
      "reason": "No user/admin number should display without math, source, confidence, and freshness."
    },
    {
      "ruleId": "journey-mapping-required",
      "subject": "new user journey step",
      "requiredFields": [
        "journeyStep",
        "durationMath",
        "eventFact",
        "debugLane"
      ],
      "validator": "check:user-journey-behavioral-intelligence",
      "reason": "Journey meaning must come from normalized facts and explicit duration math."
    },
    {
      "ruleId": "debug-interpretive-brain-required",
      "subject": "new debug lane",
      "requiredFields": [
        "rootCause",
        "owner",
        "scoreImpact",
        "nextAction",
        "drilldownPolicy"
      ],
      "validator": "check:interpretive-brain-debug-triage",
      "reason": "Debug defaults must explain root cause before raw evidence."
    },
    {
      "ruleId": "score-artifact-freshness-required",
      "subject": "new score artifact",
      "requiredFields": [
        "validator",
        "freshnessOwner",
        "scoreDimension",
        "currentHead"
      ],
      "validator": "check:beta-score",
      "reason": "Generated reports are snapshots and need a current validator before affecting score."
    },
    {
      "ruleId": "cost-class-required",
      "subject": "new cost surface",
      "requiredFields": [
        "costClass",
        "readBounds",
        "writeBounds",
        "retryPolicy",
        "summaryFirst"
      ],
      "validator": "check:cost-export-sql-parity-math",
      "reason": "Cost surfaces must be source-guarded before they surprise billing."
    },
    {
      "ruleId": "legacy-alias-canonical-map-required",
      "subject": "new legacy alias",
      "requiredFields": [
        "canonicalEventName",
        "canonicalMetricId",
        "confidenceCap",
        "dryRunOnly"
      ],
      "validator": "check:metric-canonicalization-legacy-recovery",
      "reason": "Legacy aliases can recover evidence only through documented canonical mapping."
    }
  ],
  "requiredRulesSatisfied": 8,
  "dirtyFiles": [
    {
      "path": "CHANGELOG.md",
      "classification": "release_artifact_expected"
    },
    {
      "path": "agent/state/codebase-organization-hardening.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "agent/state/codex-execution-guardrails.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "agent/state/cost-accuracy-hardening.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "agent/state/global-formula-audit.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "agent/state/legacy-canonical-recovery-plan.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "agent/state/legacy-pipeline-inventory.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "agent/state/mega-legacy-pipeline-hardening.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "agent/state/pipeline-ownership-audit.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "agent/state/public-beta-score.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "agent/state/self-revealing-codebase.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "docs/agent-truth/codebase-organization-hardening.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/codex-execution-guardrails.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/cost-accuracy-hardening.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/global-formula-audit.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/legacy-canonical-recovery-plan.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/legacy-pipeline-inventory.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/mega-legacy-pipeline-hardening.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/pipeline-ownership-audit.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/self-revealing-codebase.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "package.json",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "public/kandydrops-release-notes.json",
      "classification": "release_artifact_expected"
    },
    {
      "path": "scripts/agent/validate-codebase-organization-hardening.ts",
      "classification": "validator_artifact_expected"
    },
    {
      "path": "scripts/agent/validate-mega-legacy-pipeline-hardening.ts",
      "classification": "validator_artifact_expected"
    },
    {
      "path": "src/lib/codebase-hardening/codebase-organization-hardening.ts",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "src/lib/codebase-hardening/cost-accuracy-hardening.ts",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "src/lib/codebase-hardening/legacy-canonical-recovery-plan.ts",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "src/lib/codebase-hardening/legacy-pipeline-inventory.ts",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "src/lib/codebase-hardening/pipeline-ownership-auditor.ts",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "src/lib/codebase-hardening/pipeline-ownership-contract.ts",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "src/lib/codebase-hardening/self-revealing-codebase-contract.ts",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "src/lib/codebase-hardening/self-revealing-codebase-engine.ts",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "src/lib/math/global-formula-audit.ts",
      "classification": "real_source_change_needs_review"
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
      "path": "tests/unit/codebase-organization-hardening.spec.ts",
      "classification": "test_artifact_expected"
    },
    {
      "path": "tests/unit/mega-legacy-pipeline-hardening.spec.ts",
      "classification": "test_artifact_expected"
    }
  ],
  "openPullRequests": [
    {
      "number": 302,
      "title": "🧭 Improve onboarding friction visibility and technical rescue signals",
      "classification": "onboarding_telemetry_external_review_required"
    },
    {
      "number": 301,
      "title": "📚 Reduce doctrine drift and banned-pattern reintroduction",
      "classification": "doctrine_governance_external_review_required"
    },
    {
      "number": 300,
      "title": "🧱 Reduce monolith file risk and clarify responsibility boundaries",
      "classification": "architecture_refactor_external_review_required"
    },
    {
      "number": 299,
      "title": "chore(deps): bump the functions-npm-minor-patch group in /functions with 5 updates",
      "classification": "dependency_update_external_review_required"
    },
    {
      "number": 298,
      "title": "chore(deps): bump npm-check-updates from 19.6.6 to 22.2.1",
      "classification": "dependency_update_external_review_required"
    },
    {
      "number": 297,
      "title": "chore(deps): bump knip from 5.88.1 to 6.14.2",
      "classification": "dependency_update_external_review_required"
    },
    {
      "number": 296,
      "title": "chore(deps): bump syncpack from 14.3.0 to 15.3.1",
      "classification": "dependency_update_external_review_required"
    },
    {
      "number": 295,
      "title": "chore(deps): bump puppeteer from 24.40.0 to 25.0.4",
      "classification": "dependency_update_external_review_required"
    },
    {
      "number": 294,
      "title": "chore(deps): bump the npm-minor-patch group across 1 directory with 48 updates",
      "classification": "dependency_update_external_review_required"
    },
    {
      "number": 293,
      "title": "🛡️ Sentinel: [High] Fix insecure Math.random() usage for ID generation",
      "classification": "security_patch_external_review_required"
    },
    {
      "number": 292,
      "title": "⚡ Bolt: Replace array `.find()` with Map lookup in debug route",
      "classification": "performance_patch_external_review_required"
    },
    {
      "number": 291,
      "title": "🎨 Palette: Add accessible loading states to Creator Experiences Panel buttons",
      "classification": "accessibility_patch_external_review_required"
    }
  ],
  "selfCheck": {
    "packageScriptsPresent": true,
    "generatedArtifactsNeedValidator": true,
    "noRouteWithoutFeatureRegistration": true,
    "noMetricWithoutMathOwner": true,
    "noDebugLaneWithoutBrainMapping": true
  }
}
```
