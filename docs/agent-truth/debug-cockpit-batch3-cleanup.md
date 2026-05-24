# debug cockpit batch3 cleanup

Generated: 2026-05-24T16:01:24.977Z
Current head: 883bdc0e91e5494f3b6b3e6449d5ea722b898077
Status: source_ready

## Summary

```json
{
  "reportKey": "debug-cockpit-batch3-cleanup",
  "generatedAtUtc": "2026-05-24T16:01:24.977Z",
  "currentHead": "883bdc0e91e5494f3b6b3e6449d5ea722b898077",
  "pwaStatusBefore": "degraded",
  "pwaStatusAfter": "source_ready_not_registered",
  "identityStatusBefore": "live_unknown",
  "identityStatusAfter": "source_ready_collecting",
  "walletFunnelStatusBefore": "live_unavailable",
  "walletFunnelStatusAfter": "source_ready_no_sample_loaded",
  "emptyLiveLanesBefore": 3,
  "emptyLiveLanesAfter": 0,
  "personMetricsLowConfidenceBefore": 34,
  "personMetricsLowConfidenceAfter": 34,
  "personMetricsHydrationStatus": "source_ready_collecting",
  "staleBadgeConflictsBefore": 1,
  "staleBadgeConflictsAfter": 0,
  "sourceReadyCollectingLanes": [
    "drop_watch_time",
    "session_bounce",
    "person_metrics_hydration"
  ],
  "sourceMissingLanes": [],
  "healthyProvenZeroLanes": [],
  "compactSummaryLanes": [
    {
      "id": "event_liveness",
      "status": "degraded",
      "severity": "p2",
      "signal": "Expected live=27; recent=0; suspicious=0; sourceMissingActionable=27; materializerMissing=0; translationMissing=0; hydrationMissing=0; quietFuture=0."
    },
    {
      "id": "person_metrics_hydration",
      "status": "source_ready_collecting",
      "severity": "p2",
      "signal": "Mapped=34; envelopes=0; global=0; signed-in=0; linked=0; low-confidence=34; gaps=0."
    },
    {
      "id": "legacy_recovery",
      "status": "degraded",
      "severity": "p2",
      "signal": "March 1 recovery is dry-run only; raw legacy rows stay behind drilldowns."
    },
    {
      "id": "event_envelope",
      "status": "unknown",
      "severity": "p3",
      "signal": "Tracked events share one identity-aware envelope."
    },
    {
      "id": "event_translation_bridge",
      "status": "unknown",
      "severity": "p3",
      "signal": "Producers 0/0 connected; envelopes=0; materializers=0; person metrics=0; gaps=0; actionable activity signals=0; quiet future catalog=0."
    },
    {
      "id": "user_management",
      "status": "unknown",
      "severity": "p3",
      "signal": "Summaries=0; low-confidence=0; raw-before-summary=false; duplicate-sections=0; summary-first=false."
    },
    {
      "id": "testing_coverage",
      "status": "unknown",
      "severity": "p3",
      "signal": "Covered=0/0; missing=0; ui-only=0; waiting-gaps=0."
    },
    {
      "id": "wallet_funnel",
      "status": "source_ready_no_sample_loaded",
      "severity": "p3",
      "signal": "Wallet funnel source events are mapped; no bounded wallet funnel sample is loaded in the compact summary."
    },
    {
      "id": "identity_handoff",
      "status": "source_ready_collecting",
      "severity": "info",
      "signal": "Guest, signed-in, creator, admin, system, and legacy identity lanes are source-ready; runtime samples are classified as collecting until loaded."
    },
    {
      "id": "consent_tracking_mode",
      "status": "live",
      "severity": "info",
      "signal": "Tracking mode is governed by consent capability policy before behavioral analytics are allowed."
    },
    {
      "id": "global_user_dedupe",
      "status": "live",
      "severity": "info",
      "signal": "Duplicate risks=0; linked guest/user=healthy; global/user mismatches=0; SQL/export parity=mapped; unknown legacy=0."
    },
    {
      "id": "drop_watch_time",
      "status": "source_ready_collecting",
      "severity": "info",
      "signal": "Status reason=The source contract exists, but no bounded runtime sample has been loaded.; exact media runtime=0; active visibility estimated=0; duration missing=0; background excluded=0; page-time fallback=0."
    },
    {
      "id": "session_bounce",
      "status": "source_ready_collecting",
      "severity": "info",
      "signal": "Status reason=The source contract exists, but no bounded runtime sample has been loaded.; active=0; idle=0; missing closeouts=0; bounce classified=0; hidden excluded=0; guest/user link=not_applicable."
    },
    {
      "id": "user_journey",
      "status": "live",
      "severity": "info",
      "signal": "Builder=true; broken segments=0; missing next actions=0; source-ready funnels=8; cost guard=batched_rollup."
    },
    {
      "id": "sql_database_parity",
      "status": "live",
      "severity": "info",
      "signal": "Parity=matched; mismatches=0; export freshness=current; cost guard=batched_summary_first; external review blocked=true."
    },
    {
      "id": "behavior_math",
      "status": "live",
      "severity": "info",
      "signal": "Behavior facts stay separated from admin, projection, system, and legacy unknown activity."
    },
    {
      "id": "feature_telemetry_coverage",
      "status": "live",
      "severity": "info",
      "signal": "21 registered feature(s); exact missing links=0; duplicate event owner rows stay collapsed into canonical owners."
    },
    {
      "id": "settings_health",
      "status": "live",
      "severity": "info",
      "signal": "6 settings health component(s) summarize Account/Creator parity, route aliases, stale client preferences, support/policy links, profile API, and delete-flow status."
    },
    {
      "id": "auth_provider_conflict",
      "status": "live",
      "severity": "info",
      "signal": "Mapped conflict types=9; resolutionShown=true; unresolvedFailures=0; rawCredentialExposure=false; telemetry=mapped."
    },
    {
      "id": "auth_persistence",
      "status": "live",
      "severity": "info",
      "signal": "Persistence=browser_local_persistence_established; restored=0; unexpectedDrops=0; navigationFailures=0; profileReconnects=0; securityLogouts=0; telemetry=mapped."
    },
    {
      "id": "auth_runtime",
      "status": "live",
      "severity": "info",
      "signal": "Signup attempts=0; login attempts=0; google success=0; email success=0; providerConflicts=0; unexpectedLogouts=0; navigationFailures=0; profileBootstrapFailures=0; persistence=mapped; telemetry=mapped; personMetrics=mapped."
    },
    {
      "id": "notification_permission",
      "status": "live",
      "severity": "info",
      "signal": "Eligible=0; shown=0; granted=0; denied=0; failed=0; unsupported=0; cooldown=0; snoozed=0; telemetry=mapped."
    },
    {
      "id": "push_token_health",
      "status": "live",
      "severity": "info",
      "signal": "Users=0; devices=0; failed=0; unsupported=0; stale=0; rawTokenExposure=0; telemetry=mapped."
    },
    {
      "id": "notification_targeting",
      "status": "live",
      "severity": "info",
      "signal": "Intents=12; missingAudience=0; optOut=0; missingToken=0; consent=0; dryRunEligible=0; telemetry=mapped."
    },
    {
      "id": "pwa_service_worker",
      "status": "source_ready_not_registered",
      "severity": "info",
      "signal": "Registration=optional_not_registered; expected=false; observed=false; source=source_contract; updateAvailable=false; notificationCompatible=true; forbiddenCacheSafe=true; offlineFallbackSafe=true; staleShellRisk=low; telemetry=mapped."
    },
    {
      "id": "daily_tasks_reset",
      "status": "live",
      "severity": "info",
      "signal": "Reset=calendar_day; anchor=central_midnight; rewardSource=reward_gd_only; duplicateGuard=true; failures=0; unknownLegacy=0."
    },
    {
      "id": "daily_task_guidance_health",
      "status": "live",
      "severity": "info",
      "signal": "Active=47; hiddenDeprecated=0; brokenRoutes=0; missingSignals=0; missingTelemetry=0."
    },
    {
      "id": "daily_task_lifecycle",
      "status": "live",
      "severity": "info",
      "signal": "Missing starts=0; completions-without-starts=0; rewards-without-completions=0; duration-unavailable=0; failure-reasons=0."
    },
    {
      "id": "daily_task_reward_ledger",
      "status": "live",
      "severity": "info",
      "signal": "Granted=0; duplicateBlocked=0; ledger=transactions.daily_reward; sourceOfFunds=reward_gd; unknownLegacy=0; failedGrants=0."
    },
    {
      "id": "chat_gating_moderation",
      "status": "live",
      "severity": "info",
      "signal": "Blocked attempts=0; insufficient paid GD=0; moderation blocks=0; media blocks=0; Fan Pass bypass=0; creator reply bypass=0; source-of-funds=purchased_only_enforced."
    },
    {
      "id": "chat_telemetry_admin_truth",
      "status": "live",
      "severity": "info",
      "signal": "Active users=0; attempts=0; sent=0; blocked=0; failed=0; paid-GD gates=0; purchase CTA=0; attachments=0; moderation=0; transcript=guarded_drilldown; rawDefault=false; userLevelMetricsVisible=true; creatorLevelMetricsVisible=true."
    },
    {
      "id": "runtime_debug_evidence",
      "status": "live",
      "severity": "info",
      "signal": "Failed groups=0; warning groups=0; raw warnings collapsed=0; top root causes=route/runtime summary."
    },
    {
      "id": "cost_4xx",
      "status": "unknown",
      "severity": "info",
      "signal": "Default debug payload uses bounded summary loading; full raw debug requires explicit drilldown."
    },
    {
      "id": "open_p1_p2_backlog",
      "status": "live",
      "severity": "info",
      "signal": "0 open lower-priority backlog item(s)."
    }
  ],
  "scoreBefore": {
    "sourceHealth": 92.5,
    "runtimeHealth": 84.2,
    "evidenceCompleteness": 69.6,
    "freshness": 83.75,
    "costRisk": 42,
    "regressionRisk": 86,
    "overallHealthScore": 79.25
  },
  "scoreAfter": {
    "sourceHealth": 92.5,
    "runtimeHealth": 84.2,
    "evidenceCompleteness": 69.6,
    "freshness": 83.75,
    "costRisk": 42,
    "regressionRisk": 86,
    "overallHealthScore": 79.25
  },
  "scoreDimensions": {
    "sourceHealth": 92.5,
    "runtimeHealth": 84.2,
    "evidenceCompleteness": 69.6,
    "freshness": 83.75,
    "costRisk": 42,
    "regressionRisk": 86,
    "overallHealthScore": 79.25
  },
  "dirtyFiles": [
    {
      "path": "CHANGELOG.md",
      "classification": "release_artifact_expected"
    },
    {
      "path": "agent/context/optimized-task-context.generated.json",
      "classification": "unrelated_agent_context_file_to_ignore"
    },
    {
      "path": "agent/state/current-beta-exit-status.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "agent/state/debug-cockpit-batch3-cleanup.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "agent/state/debug-tracking-simplification.generated.json",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "agent/state/drop-watch-time-accuracy.generated.json",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "agent/state/empty-live-lane-status-cleanup.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "agent/state/event-translation-bridge.generated.json",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "agent/state/identity-handoff-spine.generated.json",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "agent/state/identity-handoff-status-cleanup.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "agent/state/notification-pwa-score-lock.generated.json",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "agent/state/overnight-beta-readiness-lock.generated.json",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "agent/state/person-metrics-hydration.generated.json",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "agent/state/public-beta-score.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "agent/state/pwa-service-worker-safety.generated.json",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "agent/state/pwa-service-worker-status-cleanup.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "agent/state/session-bounce-calculation.generated.json",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "agent/state/sql-database-parity-cost-lock.generated.json",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "agent/state/tracking-lane-freshness-display-cleanup.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "agent/state/user-journey-behavioral-intelligence.generated.json",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "agent/state/wallet-funnel-sample-cleanup.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "docs/agent-truth/current-beta-exit-status.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/debug-cockpit-batch3-cleanup.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/debug-tracking-simplification.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/drop-watch-time-accuracy.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/empty-live-lane-status-cleanup.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/event-translation-bridge.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/identity-handoff-spine.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/identity-handoff-status-cleanup.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/notification-pwa-score-lock.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/overnight-beta-readiness-lock.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/person-metrics-hydration.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/pwa-service-worker-safety.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/pwa-service-worker-status-cleanup.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/session-bounce-calculation.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/sql-database-parity-cost-lock.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/tracking-lane-freshness-display-cleanup.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/user-journey-behavioral-intelligence.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/wallet-funnel-sample-cleanup.md",
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
      "path": "scripts/agent/tracking-runtime-surface-status-cleanup-shared.ts",
      "classification": "validator_artifact_expected"
    },
    {
      "path": "scripts/agent/validate-debug-cockpit-batch3-cleanup.ts",
      "classification": "validator_artifact_expected"
    },
    {
      "path": "scripts/agent/validate-drop-watch-time-accuracy.ts",
      "classification": "validator_artifact_expected"
    },
    {
      "path": "scripts/agent/validate-empty-live-lane-status-cleanup.ts",
      "classification": "validator_artifact_expected"
    },
    {
      "path": "scripts/agent/validate-identity-handoff-status-cleanup.ts",
      "classification": "validator_artifact_expected"
    },
    {
      "path": "scripts/agent/validate-notification-pwa-score-lock.ts",
      "classification": "validator_artifact_expected"
    },
    {
      "path": "scripts/agent/validate-pwa-service-worker-safety.ts",
      "classification": "validator_artifact_expected"
    },
    {
      "path": "scripts/agent/validate-pwa-service-worker-status-cleanup.ts",
      "classification": "validator_artifact_expected"
    },
    {
      "path": "scripts/agent/validate-session-bounce-calculation.ts",
      "classification": "validator_artifact_expected"
    },
    {
      "path": "scripts/agent/validate-sql-database-parity-cost-lock.ts",
      "classification": "validator_artifact_expected"
    },
    {
      "path": "scripts/agent/validate-tracking-lane-freshness-display-cleanup.ts",
      "classification": "validator_artifact_expected"
    },
    {
      "path": "scripts/agent/validate-user-journey-behavioral-intelligence.ts",
      "classification": "validator_artifact_expected"
    },
    {
      "path": "scripts/agent/validate-wallet-funnel-sample-cleanup.ts",
      "classification": "validator_artifact_expected"
    },
    {
      "path": "src/lib/analytics/event-translation-bridge.ts",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "src/lib/analytics/person-metrics-hydration.ts",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "src/lib/debug/debug-panel-tracking-summary.ts",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "src/lib/debug/empty-live-lane-classifier.ts",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "src/lib/pwa/pwa-service-worker-contract.ts",
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
      "path": "tests/unit/debug-cockpit-batch3-cleanup.spec.ts",
      "classification": "test_artifact_expected"
    },
    {
      "path": "tests/unit/empty-live-lane-status-cleanup.spec.ts",
      "classification": "test_artifact_expected"
    },
    {
      "path": "tests/unit/identity-handoff-status-cleanup.spec.ts",
      "classification": "test_artifact_expected"
    },
    {
      "path": "tests/unit/pwa-service-worker-status-cleanup.spec.ts",
      "classification": "test_artifact_expected"
    },
    {
      "path": "tests/unit/tracking-lane-freshness-display-cleanup.spec.ts",
      "classification": "test_artifact_expected"
    },
    {
      "path": "tests/unit/wallet-funnel-sample-cleanup.spec.ts",
      "classification": "test_artifact_expected"
    }
  ],
  "openPullRequests": [],
  "remainingGaps": [
    "Runtime samples still need bounded source summaries before collecting lanes can become live.",
    "Formal provider/runtime/admin evidence gates remain separate from source status cleanup."
  ],
  "nextExactSteps": [
    "Attach bounded runtime samples for identity, wallet, drop watch, session/bounce, and person metrics hydration.",
    "Refresh stale artifacts with their owner validators when a source-live artifact is stale."
  ],
  "validationFailures": []
}
```

## Validation Failures

- none
