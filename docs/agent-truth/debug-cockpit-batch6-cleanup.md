# Debug cockpit batch6 cleanup

Generated: 2026-05-24T17:08:13.670Z
Head: a62f0177ba3e5bc7e86d8b5ec2c643258797c09a

## Summary

```json
{
  "reportKey": "debug-cockpit-batch6-cleanup",
  "generatedAtUtc": "2026-05-24T17:08:13.670Z",
  "currentHead": "a62f0177ba3e5bc7e86d8b5ec2c643258797c09a",
  "scoreBefore": {
    "sourceHealth": 92.5,
    "runtimeHealth": 84.2,
    "evidenceCompleteness": 69.6,
    "freshness": 83.75,
    "costRisk": 80.5,
    "regressionRisk": 86,
    "overallHealthScore": 83.1
  },
  "scoreAfter": {
    "sourceHealth": 92.5,
    "runtimeHealth": 84.2,
    "evidenceCompleteness": 69.6,
    "freshness": 83.75,
    "costRisk": 80.5,
    "regressionRisk": 86,
    "overallHealthScore": 83.1
  },
  "scoreDimensions": {
    "sourceHealth": 92.5,
    "runtimeHealth": 84.2,
    "evidenceCompleteness": 69.6,
    "freshness": 83.75,
    "costRisk": 80.5,
    "regressionRisk": 86,
    "overallHealthScore": 83.1
  },
  "systemStateBefore": "DEGRADED: awaiting canonical state",
  "systemStateAfter": "route_listener_delayed_with_last_verified_sample",
  "routeChecksStatus": "0 active failures",
  "routeHealthStatusBefore": "DEGRADED: 44 ok / 65 action / 2 fail",
  "routeHealthStatusAfter": "route_listener_delayed",
  "activeRouteFailures": 0,
  "staleRouteFailures": 2,
  "routeListenerStatus": "failed",
  "trackedRoutes": 173,
  "observedRoutes": 109,
  "unseenRoutesClassified": {
    "unseen_expected": 0,
    "unseen_inactive": 0,
    "unseen_source_missing": 0,
    "stale_unseen": 64
  },
  "openActionsBefore": 65,
  "openActionsAfter": 4,
  "openActionGroups": [
    {
      "kind": "current_fail_groups",
      "rowCount": 2,
      "action": "Inspect current route failures."
    },
    {
      "kind": "current_warn_groups",
      "rowCount": 8,
      "action": "Review current route warning groups."
    },
    {
      "kind": "stale_refresh_groups",
      "rowCount": 55,
      "action": "Refresh route runtime evidence."
    },
    {
      "kind": "listener_failure_group",
      "rowCount": 1,
      "action": "Repair route health listener."
    }
  ],
  "staleRouteRuntimeRowsCollapsed": 55,
  "taskUsersStatus": "source_ready_no_sample_loaded",
  "creatorIntakeStatus": "source_ready_no_sample_loaded",
  "newestSampleStatus": "healthy_current",
  "aiAssistantStatusBefore": "STALE fallback",
  "aiAssistantStatusAfter": "fallback_due_to_feed_failure",
  "aiFeedStatus": "failed",
  "aiFallbackStatus": "deterministic_fallback_accepted",
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
      "path": "agent/state/ai-assistant-fallback-cleanup.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "agent/state/debug-cockpit-batch6-cleanup.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "agent/state/open-actions-route-runtime-cleanup.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "agent/state/ops-canonical-state-cleanup.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "agent/state/route-health-reconciliation.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "agent/state/task-user-creator-intake-status-cleanup.generated.json",
      "classification": "current_generated_artifact_to_commit"
    },
    {
      "path": "docs/agent-truth/ai-assistant-fallback-cleanup.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/debug-cockpit-batch6-cleanup.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/open-actions-route-runtime-cleanup.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/ops-canonical-state-cleanup.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/route-health-reconciliation.md",
      "classification": "documentation_artifact_expected"
    },
    {
      "path": "docs/agent-truth/task-user-creator-intake-status-cleanup.md",
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
      "path": "scripts/agent/ops-health-cleanup-shared.ts",
      "classification": "validator_artifact_expected"
    },
    {
      "path": "scripts/agent/validate-ai-assistant-fallback-cleanup.ts",
      "classification": "validator_artifact_expected"
    },
    {
      "path": "scripts/agent/validate-debug-cockpit-batch6-cleanup.ts",
      "classification": "validator_artifact_expected"
    },
    {
      "path": "scripts/agent/validate-open-actions-route-runtime-cleanup.ts",
      "classification": "validator_artifact_expected"
    },
    {
      "path": "scripts/agent/validate-ops-canonical-state-cleanup.ts",
      "classification": "validator_artifact_expected"
    },
    {
      "path": "scripts/agent/validate-route-health-reconciliation.ts",
      "classification": "validator_artifact_expected"
    },
    {
      "path": "scripts/agent/validate-task-user-creator-intake-status-cleanup.ts",
      "classification": "validator_artifact_expected"
    },
    {
      "path": "src/app/admin/debug/page.tsx",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "src/lib/admin-debug-summary-cards.ts",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "src/lib/debug/ai-assistant-runtime-status.ts",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "src/lib/debug/ops-health-canonical-state.ts",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "src/lib/debug/route-health-reconciler.ts",
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
      "path": "tests/unit/ai-assistant-fallback-cleanup.spec.ts",
      "classification": "test_artifact_expected"
    },
    {
      "path": "tests/unit/debug-cockpit-batch6-cleanup.spec.ts",
      "classification": "test_artifact_expected"
    },
    {
      "path": "tests/unit/open-actions-route-runtime-cleanup.spec.ts",
      "classification": "test_artifact_expected"
    },
    {
      "path": "tests/unit/ops-canonical-state-cleanup.spec.ts",
      "classification": "test_artifact_expected"
    },
    {
      "path": "tests/unit/route-health-reconciliation.spec.ts",
      "classification": "test_artifact_expected"
    },
    {
      "path": "tests/unit/task-user-creator-intake-status-cleanup.spec.ts",
      "classification": "test_artifact_expected"
    }
  ],
  "openPrs": [],
  "remainingGaps": [
    "Route listener/feed preflight still need runtime repair before live checks and live AI summaries can be considered current."
  ],
  "nextExactSteps": [
    "Repair route listener feed, refresh route runtime evidence, and check assistant feed preflight without calling Gemini/provider services."
  ],
  "validationFailures": []
}
```

## Validation

- None.
