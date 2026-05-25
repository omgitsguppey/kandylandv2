# Person Metrics Hydration

Generated: 2026-05-25T07:10:33.725Z
Status: pass
Current head: 8f5b66d4c5465ac057ea542614a5b8d01c5d3c43

## Contract

- Person metrics hydrate from canonical event envelopes and dry-run legacy candidates only when the candidate is safe.
- Unknown legacy evidence never becomes exact user truth.
- Checkout starts remain checkout intent, not payment approval.
- Page duration never becomes watch time; watch sessions require runtime watch events.
- Missing future activity is shown as collecting/unavailable with the exact producer event, not fake zero.

## Debug Lane

- Producers registered: 196
- Producers connected: 35
- Event envelopes hydrated: 48
- Person metrics mapped: 35
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
- daily_task_guidance_interactions: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
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

- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/debug-cockpit-batch33-unlock-watch-parity.generated.json: current_generated_artifact_to_commit
- agent/state/drop-watch-time-accuracy.generated.json: current_generated_artifact_to_commit
- agent/state/event-translation-bridge.generated.json: current_generated_artifact_to_commit
- agent/state/feature-registration-gate.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: current_generated_artifact_to_commit
- agent/state/server-unlock-telemetry-emission.generated.json: current_generated_artifact_to_commit
- agent/state/unlock-rollup-reconciliation.generated.json: current_generated_artifact_to_commit
- agent/state/unlock-watch-journey-normalization.generated.json: current_generated_artifact_to_commit
- agent/state/unlock-watch-validation-semantics.generated.json: current_generated_artifact_to_commit
- agent/state/viewer-start-telemetry-repair.generated.json: current_generated_artifact_to_commit
- agent/state/watch-capture-quality-threshold.generated.json: current_generated_artifact_to_commit
- agent/state/watch-session-fact-link-repair.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/debug-cockpit-batch33-unlock-watch-parity.md: documentation_artifact_expected
- docs/agent-truth/drop-watch-time-accuracy.md: documentation_artifact_expected
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/person-metrics-hydration.md: documentation_artifact_expected
- docs/agent-truth/server-unlock-telemetry-emission.md: documentation_artifact_expected
- docs/agent-truth/unlock-rollup-reconciliation.md: documentation_artifact_expected
- docs/agent-truth/unlock-watch-journey-normalization.md: documentation_artifact_expected
- docs/agent-truth/unlock-watch-validation-semantics.md: documentation_artifact_expected
- docs/agent-truth/viewer-start-telemetry-repair.md: documentation_artifact_expected
- docs/agent-truth/watch-capture-quality-threshold.md: documentation_artifact_expected
- docs/agent-truth/watch-session-fact-link-repair.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- scripts/agent/validate-debug-cockpit-batch33-unlock-watch-parity.ts: validator_artifact_expected
- scripts/agent/validate-drop-watch-time-accuracy.ts: validator_artifact_expected
- scripts/agent/validate-event-translation-bridge.ts: validator_artifact_expected
- scripts/agent/validate-person-metrics-hydration.ts: validator_artifact_expected
- scripts/agent/validate-server-unlock-telemetry-emission.ts: validator_artifact_expected
- scripts/agent/validate-unlock-rollup-reconciliation.ts: validator_artifact_expected
- scripts/agent/validate-unlock-telemetry-truth.ts: validator_artifact_expected
- scripts/agent/validate-unlock-watch-journey-normalization.ts: validator_artifact_expected
- scripts/agent/validate-unlock-watch-validation-semantics.ts: validator_artifact_expected
- scripts/agent/validate-viewer-start-telemetry-repair.ts: validator_artifact_expected
- scripts/agent/validate-watch-capture-quality-threshold.ts: validator_artifact_expected
- scripts/agent/validate-watch-session-fact-link-repair.ts: validator_artifact_expected
- src/app/api/admin/analytics/historical/route.ts: real_source_change_needs_review
- src/app/api/drops/unlock/route.ts: real_source_change_needs_review
- src/app/api/viewer/watch-session/route.ts: real_source_change_needs_review
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/analytics/viewer-start-telemetry-contract.ts: real_source_change_needs_review
- src/lib/analytics/watch-capture-quality-contract.ts: real_source_change_needs_review
- src/lib/analytics/watch-session-fact-linker.ts: real_source_change_needs_review
- src/lib/behavioral/unlock-watch-journey-normalization.ts: real_source_change_needs_review
- src/lib/commerce/unlock-rollup-reconciliation.ts: real_source_change_needs_review
- src/lib/commerce/unlock-watch-parity-contract.ts: real_source_change_needs_review
- src/lib/server/admin-analytics-historical-validation.ts: real_source_change_needs_review
- tests/unit/debug-cockpit-batch33-unlock-watch-parity.spec.ts: test_artifact_expected
- tests/unit/server-unlock-telemetry-emission.spec.ts: test_artifact_expected
- tests/unit/unlock-rollup-reconciliation.spec.ts: test_artifact_expected
- tests/unit/unlock-watch-journey-normalization.spec.ts: test_artifact_expected
- tests/unit/unlock-watch-validation-semantics.spec.ts: test_artifact_expected
- tests/unit/viewer-start-telemetry-repair.spec.ts: test_artifact_expected
- tests/unit/watch-capture-quality-threshold.spec.ts: test_artifact_expected
- tests/unit/watch-session-fact-link-repair.spec.ts: test_artifact_expected

## Active Old Logic

- none

## Validation Failures

- none
