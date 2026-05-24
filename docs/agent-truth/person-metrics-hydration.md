# Person Metrics Hydration

Generated: 2026-05-24T15:32:34.810Z
Status: pass
Current head: 4214aa6fca1f18201e8f09ed9197f38316b035c9

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
- agent/state/behavior-math-status-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/consent-tracking-mode-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/current-beta-exit-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-signal-grouping.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-tracking-simplification.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-liveness-audit.generated.json: current_generated_artifact_to_commit
- agent/state/event-liveness-source-repair.generated.json: current_generated_artifact_to_commit
- agent/state/event-translation-bridge.generated.json: current_generated_artifact_to_commit
- agent/state/feature-registration-gate.generated.json: stale_generated_artifact_to_regenerate
- agent/state/feature-telemetry-coverage-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/legacy-recovery-status-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/person-metrics-hydration.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: stale_generated_artifact_to_regenerate
- agent/state/runtime-debug-signal-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/tracking-summary-lane-cleanup.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/behavior-math-status-cleanup.md: documentation_artifact_expected
- docs/agent-truth/consent-tracking-mode-cleanup.md: documentation_artifact_expected
- docs/agent-truth/debug-signal-grouping.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-tracking-simplification.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/event-liveness-audit.md: documentation_artifact_expected
- docs/agent-truth/event-liveness-source-repair.md: documentation_artifact_expected
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/feature-telemetry-coverage-cleanup.md: documentation_artifact_expected
- docs/agent-truth/legacy-recovery-status-cleanup.md: documentation_artifact_expected
- docs/agent-truth/person-metrics-hydration.md: documentation_artifact_expected
- docs/agent-truth/runtime-debug-signal-cleanup.md: documentation_artifact_expected
- docs/agent-truth/tracking-summary-lane-cleanup.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/tracking-summary-lane-cleanup-shared.ts: validator_artifact_expected
- scripts/agent/validate-behavior-math-status-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-consent-tracking-mode-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-debug-signal-grouping.ts: validator_artifact_expected
- scripts/agent/validate-event-liveness-audit.ts: validator_artifact_expected
- scripts/agent/validate-event-liveness-source-repair.ts: validator_artifact_expected
- scripts/agent/validate-feature-telemetry-coverage-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-legacy-recovery-status-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-runtime-debug-signal-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-tracking-summary-lane-cleanup.ts: validator_artifact_expected
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/debug/debug-panel-tracking-summary.ts: real_source_change_needs_review
- src/lib/privacy/consent-tracking-policy.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/behavior-math-status-cleanup.spec.ts: test_artifact_expected
- tests/unit/consent-tracking-mode-cleanup.spec.ts: test_artifact_expected
- tests/unit/event-liveness-source-repair.spec.ts: test_artifact_expected
- tests/unit/feature-telemetry-coverage-cleanup.spec.ts: test_artifact_expected
- tests/unit/legacy-recovery-status-cleanup.spec.ts: test_artifact_expected
- tests/unit/runtime-debug-signal-cleanup.spec.ts: test_artifact_expected
- tests/unit/tracking-summary-lane-cleanup.spec.ts: test_artifact_expected

## Active Old Logic

- none

## Validation Failures

- none
