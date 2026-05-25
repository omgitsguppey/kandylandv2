# Person Metrics Hydration

Generated: 2026-05-25T05:51:22.986Z
Status: pass
Current head: 9dc79a00f40df751841c8d8f10d98de636336397

## Contract

- Person metrics hydrate from canonical event envelopes and dry-run legacy candidates only when the candidate is safe.
- Unknown legacy evidence never becomes exact user truth.
- Checkout starts remain checkout intent, not payment approval.
- Page duration never becomes watch time; watch sessions require runtime watch events.
- Missing future activity is shown as collecting/unavailable with the exact producer event, not fake zero.

## Debug Lane

- Producers registered: 189
- Producers connected: 34
- Event envelopes hydrated: 47
- Person metrics mapped: 34
- Low-confidence metrics: 0
- Gaps: 0

## Metric Hydration

- sessions: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- visits: state=hydrated; count=3; confidence=exact; provenZero=false; missing=none
- active_days: state=hydrated; count=5; confidence=exact; provenZero=false; missing=none
- page_views: state=hydrated; count=3; confidence=exact; provenZero=false; missing=none
- creator_profile_views: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- drop_opens: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- unwraps: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- wallet_opens: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- wallet_closes: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- package_selections: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- checkout_starts: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- payment_approvals: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- payment_cancels: state=hydrated; count=2; confidence=exact; provenZero=false; missing=none
- payment_failures: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- fan_pass_views: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- fan_pass_purchases: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- broadcasts_viewed: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- broadcasts_clicked: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- follows: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- chat_actions: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- daily_task_views: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- daily_task_starts: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- daily_task_completions: state=hydrated; count=2; confidence=exact; provenZero=false; missing=none
- daily_task_failures: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- daily_task_rewards_granted: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- daily_task_average_duration: state=hydrated; count=4; confidence=exact; provenZero=false; missing=none
- daily_task_abandonments: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- daily_task_reset_locked_views: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- notification_interactions: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- runtime_watch_sessions: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- settings_actions: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- support_account_actions: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- creator_drop_manager_actions: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- auth_runtime_events: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none

## Score Impact

- sourceHealth: before=80; after=84; Person metrics hydrate from canonical envelopes with missing future activity reported as collecting instead of fake zero.
- runtimeHealth: before=80; after=84; Person metrics hydrate from canonical envelopes with missing future activity reported as collecting instead of fake zero.
- evidenceCompleteness: before=80; after=84; Person metrics hydrate from canonical envelopes with missing future activity reported as collecting instead of fake zero.
- freshness: before=80; after=84; Person metrics hydrate from canonical envelopes with missing future activity reported as collecting instead of fake zero.
- costRisk: before=80; after=84; Hydration is source-only and does not add production reads or live data mutation.
- regressionRisk: before=80; after=84; Person metrics hydrate from canonical envelopes with missing future activity reported as collecting instead of fake zero.

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/advanced-telemetry-parity-ui-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/current-beta-exit-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-cockpit-batch18-route-hotspots.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-cockpit-batch30-telemetry-parity.generated.json: current_generated_artifact_to_commit
- agent/state/debug-panel-output-triage.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-runtime-evidence.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-envelope-normalization.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-liveness-audit.generated.json: current_generated_artifact_to_commit
- agent/state/event-translation-bridge.generated.json: current_generated_artifact_to_commit
- agent/state/ingest-identified-parity-blocker.generated.json: current_generated_artifact_to_commit
- agent/state/overnight-beta-readiness-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: stale_generated_artifact_to_regenerate
- agent/state/refresh-diagnostics-failure-clusters.generated.json: current_generated_artifact_to_commit
- agent/state/telemetry-admin-debug-truth.generated.json: stale_generated_artifact_to_regenerate
- agent/state/telemetry-parity-pass-gate.generated.json: current_generated_artifact_to_commit
- agent/state/telemetry-parity-score.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/advanced-telemetry-parity-ui-cleanup.md: documentation_artifact_expected
- docs/agent-truth/current-beta-exit-status.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-cockpit-batch30-telemetry-parity.md: documentation_artifact_expected
- docs/agent-truth/debug-runtime-evidence.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/event-envelope-normalization.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/event-liveness-audit.md: documentation_artifact_expected
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/ingest-identified-parity-blocker.md: documentation_artifact_expected
- docs/agent-truth/overnight-beta-readiness-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/person-metrics-hydration.md: documentation_artifact_expected
- docs/agent-truth/refresh-diagnostics-failure-clusters.md: documentation_artifact_expected
- docs/agent-truth/telemetry-admin-debug-truth.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/telemetry-parity-pass-gate.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/debug-cockpit-batch30-telemetry-parity-shared.ts: validator_artifact_expected
- scripts/agent/validate-admin-debug-control-tower.ts: validator_artifact_expected
- scripts/agent/validate-advanced-telemetry-parity-ui-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-debug-cockpit-batch30-telemetry-parity.ts: validator_artifact_expected
- scripts/agent/validate-event-liveness-audit.ts: validator_artifact_expected
- scripts/agent/validate-ingest-identified-parity-blocker.ts: validator_artifact_expected
- scripts/agent/validate-refresh-diagnostics-failure-clusters.ts: validator_artifact_expected
- scripts/agent/validate-telemetry-parity-pass-gate.ts: validator_artifact_expected
- src/app/admin/debug/components/DebugAdvancedDataValidation.tsx: real_source_change_needs_review
- src/app/api/admin/analytics/historical/route.ts: real_source_change_needs_review
- src/lib/analytics/advanced-telemetry-parity-ui.ts: real_source_change_needs_review
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/analytics/ingest-identified-parity-blocker.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/analytics/refresh-diagnostics-failure-clusters.ts: real_source_change_needs_review
- src/lib/analytics/telemetry-parity-pass-gate.ts: real_source_change_needs_review
- src/lib/debug/debug-cockpit-batch30-telemetry-parity.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- src/lib/server/admin-analytics-historical-validation.ts: real_source_change_needs_review
- src/types/admin-analytics.ts: real_source_change_needs_review
- tests/unit/admin-data-validation.spec.ts: test_artifact_expected
- tests/unit/advanced-telemetry-parity-ui-cleanup.spec.ts: test_artifact_expected
- tests/unit/debug-cockpit-batch30-telemetry-parity.spec.ts: test_artifact_expected
- tests/unit/ingest-identified-parity-blocker.spec.ts: test_artifact_expected
- tests/unit/refresh-diagnostics-failure-clusters.spec.ts: test_artifact_expected
- tests/unit/telemetry-parity-pass-gate.spec.ts: test_artifact_expected

## Active Old Logic

- none

## Validation Failures

- none
