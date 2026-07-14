# Debug Cockpit Batch10 Cleanup

Generated source-only Batch 10 evidence. No production reads, deploys, provider calls, payment runtime changes, or GumDrop math changes were performed.

```json
{
  "generatedAtUtc": "2026-07-14T07:19:02.643Z",
  "reportKey": "debug-cockpit-batch10-cleanup",
  "betaScoreHeadBefore": "a54fc24ccc1ad7b3d23c7aa2a6b3c5bb354fde76",
  "betaScoreHeadAfter": "dc4dad82c4ee6f08f8570c9efb2b9ba61fafafaa",
  "repoHead": "dc4dad82c4ee6f08f8570c9efb2b9ba61fafafaa",
  "selfHealingAgeBefore": 406694.6,
  "selfHealingAgeAfter": 0,
  "speedSecurityScoreBefore": 51,
  "speedSecurityScoreAfter": 100,
  "speedSecurityFindingsBefore": 177,
  "speedSecurityFindingsAfter": 1,
  "speedSecurityAgeAfter": 1.85,
  "hardeningScoreBefore": 97,
  "hardeningScoreAfter": 100,
  "hardeningFindingsBefore": 6,
  "hardeningFindingsAfter": 0,
  "hardeningAgeAfter": 1.85,
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
    "sourceHealth": 95.5,
    "runtimeHealth": 70.22,
    "evidenceCompleteness": 80,
    "freshness": 92.5,
    "costRisk": 92.5,
    "regressionRisk": 94,
    "overallHealthScore": 83.38
  },
  "remainingFindings": [],
  "dirtyFilesClassified": [
    {
      "file": "env.example",
      "classification": "source_security_fix_required"
    },
    {
      "file": "FULL_SCALE_CODEBASE_AUDIT.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "README.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "REPO_MEMORY_LEDGER.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "agent/context/optimized-task-context.generated.json",
      "classification": "source_security_fix_required"
    },
    {
      "file": "agent/index/ui-surface-coverage.json",
      "classification": "source_security_fix_required"
    },
    {
      "file": "agent/state/4xx-cost-guardrails.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/account-settings-delete-flow.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/account-settings-mobile-padding.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/admin-truth-replacement.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/analytics-cost-runtime-inventory.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/analytics-ingest-firestore-closure.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/analytics-rewire-phase-one.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/backend-route-inventory.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/backend-service-ownership.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/behavior-math-verification.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/chat-composer-modal-lift.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/chat-presence-typing.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/cloudrun-sql-bigquery-guardrails.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/codebase-hardening.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/config-env-contract.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/config-infra-gut-consolidation.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/config-infra-memory-writeback.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/consent-tracking-contract.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/content-protection-score.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/cookie-banner-settings-sync.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/cost-4xx-reduction.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/cost-data-connect-refresh.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/creator-broadcast-timeline-prep.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/creator-drop-4xx-policy.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/creator-drop-management-approval.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/creator-drop-manager-mobile-refinement.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/creator-drop-submit-repair.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/creator-drop-workflow-contract.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/creator-experience-simplification.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/creator-fan-pass-crm-broadcast.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/creator-landing-dashboard-mobile.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/creator-lane-debug-parity.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/creator-lane-legacy-truth-inventory.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/creator-monetization-gates-lock.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/creator-nav-role-consolidation.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/creator-profile-mobile-timeline.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/creator-settings-source-health.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/creator-surface-routing.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/daily-task-guidance-route-audit.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/daily-task-reward-ledger.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/data-connect-mirror-status.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/debug-cockpit-batch10-cleanup.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/debug-evidence-index.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/debug-evidence-precacher-refresh.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/deeptracker-telemetry-volume-reduction.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/dependency-toolchain-policy.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/device-layout-score.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/device-ui-dry-audit.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/drop-watch-unlock-math.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/event-catalog-telemetry-audit.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/event-translation-bridge.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/evidence-freshness-index.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/final-math-normalization-lock.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/final-release-exit-readiness-packet.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/final-user-tracking-handoff-lock.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/frontend-component-consolidation.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/frontend-gut-consolidation.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/generated-report-authority.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/global-cost-surfaces.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/google-cost-bleed.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/guest-user-analytics-cutover.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/guest-user-identity-transfer.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/gumdrop-economy-accuracy.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/gumdrop-economy-score.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/hydration-performance.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/identity-chain-contract.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/identity-handoff-4xx-policy.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/identity-privacy-raw-ledger-rewire.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/identity-tracking-memory-writeback.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/individual-user-metric-truth.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/legacy-phaseout.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/lost-data-recovery-dry-run.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/media-upload-lifecycle.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/monolith-orphan-metric-registry.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/notification-permission-lifecycle.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/orphaned-logic-score.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/person-metrics-hydration.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/precatch-runtime-issues.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/privacy-behavior-legacy-recovery.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/private-media-access.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/public-beta-score.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/release-notes-integrity.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/release-rollback-incident-readiness.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/security-header-route-config.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/security-rules-inventory.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/self-healing-refresh-queue.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/settings-connection-parity.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/settings-debug-validator-authority.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/settings-route-alias-cleanup.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/sitewide-image-optimization-cleanup.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/sitewide-image-optimization.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/speed-security-hardening.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/support-creator-refresh.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/support-policy-surface-cleanup.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/support-recovery-flow-audit.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/telemetry-behavior-refresh.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/telemetry-parity-score.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/unlock-transaction-source-metadata.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/user-creator-logic-cleanup.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/user-profile-api-contract.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/user-tracking-index-cutover.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/viewer-entitlement-hardening.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "agent/state/wallet-packages-route-repair.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "file": "apphosting.yaml",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/account-settings-delete-flow.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/account-settings-mobile-padding.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/analytics-cost-runtime-inventory.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/analytics-ingest-firestore-closure.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/backend-route-inventory.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/backend-service-ownership.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/chat-composer-modal-lift.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/chat-presence-typing.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/config-env-contract.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/config-infra-gut-consolidation.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/config-infra-memory-writeback.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/consent-tracking-contract.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/cost-4xx-reduction.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/cost-data-connect-refresh.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/creator-broadcast-timeline-prep.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/creator-drop-4xx-policy.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/creator-drop-management-approval.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/creator-drop-submit-repair.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/creator-drop-workflow-contract.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/creator-experiences-copy.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/creator-nav-role-consolidation.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/creator-profile-mobile-timeline.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/creator-settings-source-health.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/creator-surface-routing.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/daily-task-guidance-route-audit.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/daily-task-reward-ledger.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/debug-cockpit-batch10-cleanup.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/debug-evidence-precacher-refresh.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/deeptracker-telemetry-volume-reduction.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/dependency-toolchain-policy.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/drop-watch-unlock-math.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/event-translation-bridge.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/evidence-freshness-index.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/final-math-normalization-lock.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/final-release-exit-readiness-packet.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/final-user-tracking-handoff-lock.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/frontend-component-consolidation.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/frontend-gut-consolidation.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/guest-user-analytics-cutover.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/guest-user-identity-transfer.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/identity-chain-contract.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/identity-handoff-4xx-policy.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/identity-tracking-memory-writeback.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/individual-user-metric-truth.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/legacy-phaseout.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/media-upload-lifecycle.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/monolith-orphan-metric-registry.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/notification-permission-lifecycle.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/person-metrics-hydration.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/privacy-behavior-legacy-recovery.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/private-media-access.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/release-notes-integrity.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/release-rollback-incident-readiness.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/security-rules-inventory.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/self-healing-refresh-queue.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/settings-connection-parity.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/settings-debug-validator-authority.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/settings-route-alias-cleanup.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/sitewide-image-optimization-cleanup.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/support-creator-refresh.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/support-policy-surface-cleanup.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/telemetry-behavior-refresh.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/unlock-transaction-source-metadata.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/user-profile-api-contract.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/user-tracking-indexes.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/viewer-entitlement-hardening.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "docs/agent-truth/wallet-packages-route-repair.md",
      "classification": "source_security_fix_required"
    },
    {
      "file": "firestore.indexes.json",
      "classification": "source_security_fix_required"
    },
    {
      "file": "functions/package-lock.json",
      "classification": "source_security_fix_required"
    },
    {
      "file": "functions/src/analytics-bigquery-export.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "functions/src/index.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "functions/tsconfig.json",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/debug-cockpit-batch10-shared.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/debug-cockpit-batch13-shared.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/debug-cockpit-batch14-shared.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/score-codebase-hardening.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/score-guest-user-analytics-cutover.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/score-legacy-phaseout.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/score-speed-security-hardening.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/score-user-tracking-indexes.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/snapshot-admin-vendor-cost-rewire.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-accessibility-tap-targets.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-admin-ai-control-tower.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-admin-user-behavior-truth.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-analytics-cost-runtime-inventory.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-chat-composer-modal-lift.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-chat-paid-gumdrops-guidance.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-consent-tracking-contract.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-content-media-pipeline.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-cookie-banner-settings-sync.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-creator-experiences-copy.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-creator-nav-role-consolidation.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-creator-profile-mobile-timeline.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-creator-profile-routing.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-deeptracker-telemetry-volume-reduction.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-error-handling-final-readiness.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-event-catalog-telemetry.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-event-fact-truth.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-event-translation-bridge.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-existing-algorithm-refinement.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-final-math-normalization-lock.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-frontend-component-consolidation.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-guest-user-analytics-cutover.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-identity-link-continuity.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-ios-pwa-chat-refinements.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-legacy-phaseout.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-media-upload-lifecycle.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-notification-permission-lifecycle.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-payment-unlock-security.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-phase-one-score-ui-triage.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-public-beta-changelog.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-purchase-telemetry-truth.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-repo-doctrine-reset.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-server-unlock-telemetry-emission.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-support-recovery-flows.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-unlock-telemetry-truth.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/agent/validate-user-chat-shell-routing.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/local-exe/KandyDropsLauncher.cs",
      "classification": "source_security_fix_required"
    },
    {
      "file": "scripts/local-exe/build-local-exes.ps1",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/HomeClient.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/admin/content/page.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/admin/debug/components/DebugControlTowerCards.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/admin/user/[userId]/page.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/admin/users/page.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/ai/drop-covers/feedback/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/ai/drop-covers/generate/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/ai/drop-covers/references/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/ai/drop-covers/review-gallery/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/ai/drop-covers/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/ai/drop-covers/template/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/ai/drop-descriptions/feedback/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/ai/drop-descriptions/generate/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/ai/drop-descriptions/prompt-policy/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/ai/drop-descriptions/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/content/route.ts",
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
      "file": "src/app/api/admin/creator-fan-experience-settings/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/creators/[userId]/action/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/debug/assistant/fix/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/debug/assistant/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/drops/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/economy/offers/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/economy/packages/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/economy/promos/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/orchestration/repairs/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/queue/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/queue/toggle/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/roster/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/support/threads/[threadId]/messages/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/support/threads/[threadId]/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/tasks/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/ui/preferences/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/user/[userId]/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/users/[userId]/username/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/users/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/admin/view-as-creator/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/analytics/identity-link/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/analytics/ingest-identified/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/analytics/ingest/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/auth/manual-sign-in-lookup/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/chat/attachments/cancel/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/chat/attachments/complete/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/chat/attachments/prepare/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/chat/threads/[threadId]/messages/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/creator/drops/assets/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/creator/drops/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/creator/messages/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/creator/onboarding/application/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/creator/onboarding/contract-signature/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/creator/onboarding/id-submission/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/creator/onboarding/intro/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/creator/payouts/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/creator/relationships/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/creator/settings/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/debug/evidence/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/drops/duplicate-filenames/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/drops/feedback/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/drops/impression/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/drops/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/drops/track/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/drops/unlock/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/notifications/push-token/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/notifications/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/paypal/capture/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/paypal/create/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/privacy/consent/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/security/log-attempt/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/settings/landing/upload/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/support/threads/[threadId]/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/support/threads/guest/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/support/threads/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/tasks/feedback/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/tasks/materialize/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/user/complete-onboarding/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/wallet/packages/route.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/creators/[username]/CreatorProfileClient.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/dashboard/profile/hooks/useProfileState.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/dashboard/viewer/components/MediaViewer.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/components/Admin/AiDropCoverGeneratorPanel.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/components/Analytics/DeepTracker.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/components/Chat/ChatExperience.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/components/CookieBanner.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/components/Creators/CreatorBroadcastManager.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/components/DropPreviewModal.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/components/Drops/LockedDropPreviewView.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/components/Navigation/ProfileDropdown.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/components/PurchaseModal.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/components/errors/HumanErrorNotice.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/admin-ai-models.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/admin-analytics-region-demand.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/ai-cover/cover-semantic-brief.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/ai-cover/cover-title-parser.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/ai-drop-covers.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/analytics/analytics-identity-link.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/analytics/client-telemetry-priority.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/analytics/event-translation-bridge.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/analytics/identity-link-contract.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/analytics/ingest-contract.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/analytics/materialization-contract.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/analytics/person-metrics-contract.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/analytics/person-metrics-engine.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/analytics/person-metrics-hydration.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/authFetch.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/behavioral/behavioral-explanation.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/behavioral/behavioral-timeline-contract.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/behavioral/normalize-event-fact.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/codebase-hardening/legacy-pipeline-inventory.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/codebase-hardening/self-revealing-codebase-engine.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/frontend-hardening/frontend-surface-inventory.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/identity-truth/individual-user-metric-truth.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/image-loading-policy.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/legacy/legacy-registry.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/math/canonical-math-ledger.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/math/global-formula-audit.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/math/math-authority-map.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/release-notes/release-version-contract.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/release-readiness/automated-truth-reconciliation.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/release-readiness/final-release-readiness.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/route-runtime-health.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/runtime-facts/normalize-runtime-fact.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/runtime-facts/runtime-fact-contract.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/server/admin-analytics-data.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/server/admin-analytics-shared.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/server/admin-analytics/ga4-evidence.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/server/ai-drop-covers.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/server/analytics-governance.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/server/analytics-identity-linking.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/server/api-cost-contract.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/server/behavioral-timeline-mapper.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/server/behavioral-timeline-writer.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/server/bounded-json-body.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/server/global-cost-surface-contract.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/server/paypal.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/server/route-cache-contract.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/server/security-hardening-contract.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/server/user-index-materializer.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/server/user-index-writer.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/telemetry.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/testing/telemetry-trigger-test-matrix.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/user-indexes/user-index-normalizer.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/user-indexes/user-tracking-index-contract.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/user-mobile-shell.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/accessibility-tap-targets.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/account-settings-delete-flow.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/account-settings-mobile-padding.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-ai-drop-covers-generate-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-ai-drop-covers-ops-routes.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-ai-drop-covers-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-ai-drop-covers-template-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-ai-models.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-analytics-auth-outcome-split.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-analytics-auth-outcomes-mobile.spec.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-analytics-data.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-analytics-region-demand.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-analytics-shared.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-bug-reports-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-content-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-creator-action-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-creator-agreements-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-creator-fan-experience-settings-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-debug-assistant-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-debug-control-tower-component.spec.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-debug-control-tower.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-overview-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-roster-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-stats-bar-compact.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-support-threads-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-task-pipeline.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-user-username-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-users-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-view-as-creator-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/ai-drop-covers.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/analytics-cost-hot-path-reduction.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/analytics-cost-runtime-inventory.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/analytics-hot-path-cost-reduction.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/analytics-ingest-identified-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/analytics-ingest-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/automated-truth-reconciliation.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/batch12-readiness-refresh.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/bounded-json-body.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/canonical-math-ledger.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/chat-attachments-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/chat-composer-modal-lift.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/chat-thread-messages-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/complete-onboarding-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/consent-tracking-contract.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/content-protection-truth.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/cookie-banner-settings-sync.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/cost-owner-review-source-closure.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/creator-broadcast-manager.spec.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/creator-broadcasts-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/creator-contract-signature-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/creator-drop-management-approval.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/creator-drop-manager-mobile-refinement.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/creator-drops-assets-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/creator-drops-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/creator-fan-pass-crm-broadcast.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/creator-id-submission-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/creator-messages-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/creator-nav-role-consolidation.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/creator-onboarding-alerts.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/creator-onboarding-application-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/creator-onboarding-intro-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/creator-profile-mobile-timeline.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/creator-profile-routing.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/creator-relationships-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/creator-settings-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/creator-workspace-panel.spec.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/daily-checkin-variant.spec.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/daily-task-debug-score-lock.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/daily-task-lifecycle-telemetry.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/debug-bug-report-summary.spec.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/debug-cockpit-batch12-cleanup.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/debug-cockpit-batch13-cleanup.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/debug-cockpit-batch14-cleanup.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/debug-cockpit-batch15-false-positive-cleanup.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/debug-cockpit-batch3-cleanup.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/debug-cockpit-batch4-cleanup.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/debug-cockpit-batch5-cleanup.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/debug-cockpit-batch7-control-tower-cleanup.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/debug-cockpit-batch8-cleanup.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/debug-control-tower-cards.spec.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/deeptracker-telemetry-volume-reduction.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/drops-feedback-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/drops-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/drops-unlock-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/duplicate-filenames-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/event-fact-truth.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/event-translation-bridge.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/final-behavioral-privacy-telemetry-lock.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/final-cost-audit-lock.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/final-math-normalization-lock.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/final-release-exit-readiness-packet.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/final-user-tracking-handoff-lock.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/formal-evidence-status-ledger.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/frontend-component-consolidation.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/ga4-recovery-truth.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/generated-artifact-size-policy.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/guest-user-identity-transfer.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/human-error-notice.spec.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/human-error-surface-wiring.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/identity-mismatch-closure.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/image-loading-policy.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/individual-user-metric-truth.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/manual-sign-in-lookup-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/media-upload-lifecycle.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/mobile-ui-scaling-doctrine.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/no-sample-route-cohort-cleanup.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/notification-permission-lifecycle.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/notifications-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/orphaned-logic-refresh.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/paypal-capture-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/person-metrics-contract.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/person-metrics-hydration.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/phase-one-score-ui-triage.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/public-beta-release-notes.spec.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/purchase-modal.spec.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/release-notes-integrity.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/repo-doctrine-reset.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/security-log-attempt-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/server-ai-drop-covers.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/server-drops.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/server-unlock-telemetry-emission.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/settings-connection-parity.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/settings-debug-validator-authority.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/settings-route-alias-cleanup.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/source-agreement-failure-detail.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/speed-security-hardening.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/support-creator-refresh.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/support-policy-surface-cleanup.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/support-threads-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/synthetic-creators-view-as.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/task-observability.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/tasks-feedback-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/telemetry.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/use-chat-unread-status.spec.tsx",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/user-creator-ui-parity.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/user-index-normalizer.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/user-profile-api-contract.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/user-register-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/wallet-packages-route-repair.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "functions/src/scheduled-http-client.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "functions/src/user-index-materializer-schedule.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/app/api/internal/",
      "classification": "source_security_fix_required"
    },
    {
      "file": "src/lib/server/paypal-order-state.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-auth-bounded-body-routes.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/admin-core-bounded-body-routes.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/analytics-identity-linking.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/auth-fetch-app-check.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/behavioral-timeline-projection.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/creator-debug-drop-bounded-body-routes.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/critical-user-bounded-body-routes.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/local-exe-launcher.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/scheduled-http-client.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/tasks-materialize-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/user-index-materializer-consumer.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/user-index-materializer-core.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/user-index-materializer-route.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/user-index-materializer-schedule.spec.ts",
      "classification": "source_security_fix_required"
    },
    {
      "file": "tests/unit/utils/source-validator-contract.ts",
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
