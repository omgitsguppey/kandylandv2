# Person Metrics Hydration

Generated: 2026-06-03T04:30:37.198Z
Status: fail
Current head: 225f9e53f18b60edc7399c1ea258c0b9bacfae84

## Contract

- Person metrics hydrate from canonical event envelopes and dry-run legacy candidates only when the candidate is safe.
- Unknown legacy evidence never becomes exact user truth.
- Checkout starts remain checkout intent, not payment approval.
- Page duration never becomes watch time; watch sessions require runtime watch events.
- Missing future activity is shown as collecting/unavailable with the exact producer event, not fake zero.

## Debug Lane

- Producers registered: 260
- Producers connected: 37
- Event envelopes hydrated: 105
- Person metrics mapped: 37
- Low-confidence metrics: 0
- Gaps: 0

## Metric Hydration

- sessions: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- visits: state=hydrated; count=3; confidence=exact; provenZero=false; missing=none
- active_days: state=hydrated; count=5; confidence=exact; provenZero=false; missing=none
- page_views: state=hydrated; count=3; confidence=exact; provenZero=false; missing=none
- creator_profile_views: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- search_discovery_actions: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- drop_opens: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- drop_unlocks: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
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

- agent/state/activity-verification-engine.generated.json: current_generated_artifact_to_commit
- agent/state/admin-truth-source-sample.generated.json: stale_generated_artifact_to_regenerate
- agent/state/algorithmic-evidence-policy.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-cost-runtime-inventory.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-hydration-consolidation-audit.generated.json: current_generated_artifact_to_commit
- agent/state/analytics-hydration-consolidation.generated.json: current_generated_artifact_to_commit
- agent/state/analytics-panel-hydration.generated.json: current_generated_artifact_to_commit
- agent/state/beta-evidence-gap-map.generated.json: stale_generated_artifact_to_regenerate
- agent/state/beta-evidence-lane-prep.generated.json: stale_generated_artifact_to_regenerate
- agent/state/beta-freshness-language.generated.json: stale_generated_artifact_to_regenerate
- agent/state/chat-functionality-score-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/chat-gating-moderation.generated.json: stale_generated_artifact_to_regenerate
- agent/state/chat-realtime-cost-control.generated.json: stale_generated_artifact_to_regenerate
- agent/state/chat-telemetry-admin-truth.generated.json: current_generated_artifact_to_commit
- agent/state/cloud-sql-gemini-cost-guards.generated.json: stale_generated_artifact_to_regenerate
- agent/state/cost-owner-review-source-closure.generated.json: stale_generated_artifact_to_regenerate
- agent/state/cost-risk-exit-pass.generated.json: stale_generated_artifact_to_regenerate
- agent/state/cost-risk-owner-review-closure.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-dashboard-error-cost-inventory.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-drop-status-metrics.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-experience-simplification.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-monetization-readiness-lock.generated.json: current_generated_artifact_to_commit
- agent/state/creator-settings-control-plane.generated.json: stale_generated_artifact_to_regenerate
- agent/state/current-beta-exit-status.generated.json: current_generated_artifact_to_commit
- agent/state/daily-task-debug-score-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-guidance-route-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-lifecycle-telemetry.generated.json: current_generated_artifact_to_commit
- agent/state/daily-task-reset-truth.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-reward-ledger.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-panel-output-triage.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-runtime-evidence.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-score-impact-triage.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-signal-actionability.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-signal-grouping.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-envelope-normalization.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-liveness-audit.generated.json: current_generated_artifact_to_commit
- agent/state/event-translation-bridge.generated.json: current_generated_artifact_to_commit
- agent/state/evidence-capture-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/existing-algorithm-refinement.generated.json: stale_generated_artifact_to_regenerate
- agent/state/feature-registration-gate.generated.json: current_generated_artifact_to_commit
- agent/state/final-cost-audit-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/final-parity-telemetry-lock.generated.json: current_generated_artifact_to_commit
- agent/state/final-pr-stale-cleanup.generated.json: stale_generated_artifact_to_regenerate
- agent/state/final-telemetry-closure-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/formal-evidence-bridge.generated.json: stale_generated_artifact_to_regenerate
- agent/state/global-marquee-truncated-titles.generated.json: stale_generated_artifact_to_regenerate
- agent/state/media-discovery-score-lock.generated.json: current_generated_artifact_to_commit
- agent/state/mobile-loading-hydration-stability.generated.json: stale_generated_artifact_to_regenerate
- agent/state/mobile-ui-final-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/operator-revenue-smoke.generated.json: stale_generated_artifact_to_regenerate
- agent/state/overnight-beta-readiness-lock.generated.json: current_generated_artifact_to_commit
- agent/state/overnight-final-integration-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/overnight-wiring-integrity.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: current_generated_artifact_to_commit
- agent/state/post-economy-creator-flow-qa.generated.json: stale_generated_artifact_to_regenerate
- agent/state/public-beta-score.generated.json: stale_generated_artifact_to_regenerate
- agent/state/regression-risk-high-blast-refresh.generated.json: stale_generated_artifact_to_regenerate
- agent/state/runtime-smoke-substitute-matrix.generated.json: stale_generated_artifact_to_regenerate
- agent/state/runtime-watch-time-v2.generated.json: stale_generated_artifact_to_regenerate
- agent/state/score-80-cost-readiness.generated.json: stale_generated_artifact_to_regenerate
- agent/state/score-80-reconciliation-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/score-80-refresh-pass.generated.json: stale_generated_artifact_to_regenerate
- agent/state/settings-connection-parity.generated.json: stale_generated_artifact_to_regenerate
- agent/state/source-backed-runtime-confidence.generated.json: stale_generated_artifact_to_regenerate
- agent/state/source-truth-authority-map.generated.json: stale_generated_artifact_to_regenerate
- agent/state/targeted-behavior-evidence.generated.json: current_generated_artifact_to_commit
- agent/state/telemetry-admin-debug-truth.generated.json: stale_generated_artifact_to_regenerate
- agent/state/telemetry-trigger-test-matrix.generated.json: current_generated_artifact_to_commit
- agent/state/user-creator-ui-parity.generated.json: stale_generated_artifact_to_regenerate
- agent/state/user-facing-feature-connection-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/user-management-refactor.generated.json: current_generated_artifact_to_commit
- agent/state/user-profile-api-contract.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/admin-truth-source-sample.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/analytics-cost-runtime-inventory.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/analytics-hydration-consolidation-audit.md: documentation_artifact_expected
- docs/agent-truth/analytics-hydration-consolidation.md: documentation_artifact_expected
- docs/agent-truth/analytics-panel-hydration.md: documentation_artifact_expected
- docs/agent-truth/beta-evidence-gap-map.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/beta-evidence-lane-prep.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/beta-freshness-language.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/chat-functionality-score-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/chat-gating-moderation.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/chat-realtime-cost-control.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/chat-telemetry-admin-truth.md: documentation_artifact_expected
- docs/agent-truth/cloud-sql-gemini-cost-guards.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/cost-owner-review-source-closure.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/cost-risk-exit-pass.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/cost-risk-owner-review-closure.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/creator-dashboard-error-cost-inventory.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/creator-drop-status-metrics.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/creator-monetization-readiness-lock.md: documentation_artifact_expected
- docs/agent-truth/creator-settings-control-plane.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/current-beta-exit-status.md: documentation_artifact_expected
- docs/agent-truth/daily-task-debug-score-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-guidance-route-audit.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-lifecycle-telemetry.md: documentation_artifact_expected
- docs/agent-truth/daily-task-reset-truth.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-reward-ledger.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-runtime-evidence.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-score-impact-triage.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-signal-actionability.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-signal-grouping.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/event-envelope-normalization.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/event-liveness-audit.md: documentation_artifact_expected
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/evidence-capture-status.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/existing-algorithm-refinement.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/feature-registration-gate.md: documentation_artifact_expected
- docs/agent-truth/final-cost-audit-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/final-parity-telemetry-lock.md: documentation_artifact_expected
- docs/agent-truth/final-pr-stale-cleanup.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/final-telemetry-closure-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/formal-evidence-bridge.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/global-marquee-truncated-titles.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/media-discovery-score-lock.md: documentation_artifact_expected
- docs/agent-truth/mobile-loading-hydration-stability.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/mobile-ui-final-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/operator-revenue-smoke.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/overnight-beta-readiness-lock.md: documentation_artifact_expected
- docs/agent-truth/overnight-final-integration-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/overnight-wiring-integrity.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/person-metrics-hydration.md: documentation_artifact_expected
- docs/agent-truth/post-economy-creator-flow-qa.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/regression-risk-high-blast-refresh.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/runtime-smoke-substitute-matrix.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/runtime-watch-time-v2.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/score-80-cost-readiness.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/score-80-reconciliation-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/score-80-refresh-pass.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/settings-connection-parity.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/source-backed-runtime-confidence.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/source-truth-authority-map.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/targeted-behavior-evidence.md: documentation_artifact_expected
- docs/agent-truth/telemetry-admin-debug-truth.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/telemetry-trigger-test-matrix.md: documentation_artifact_expected
- docs/agent-truth/user-management-refactor.md: documentation_artifact_expected
- docs/agent-truth/user-profile-api-contract.md: stale_generated_artifact_to_regenerate
- scripts/agent/score-public-beta-readiness.ts: real_source_change_needs_review
- scripts/agent/validate-analytics-hydration-consolidation.ts: validator_artifact_expected
- scripts/agent/validate-analytics-panel-hydration.ts: validator_artifact_expected
- scripts/agent/validate-creator-dashboard-error-cost-inventory.ts: unsafe_unknown
- scripts/agent/validate-creator-monetization-readiness-lock.ts: validator_artifact_expected
- scripts/agent/validate-final-parity-telemetry-lock.ts: validator_artifact_expected
- scripts/agent/validate-media-discovery-score-lock.ts: validator_artifact_expected
- scripts/agent/validate-post-economy-creator-flow-qa.ts: unsafe_unknown
- scripts/agent/validate-public-beta-score.ts: validator_artifact_expected
- scripts/agent/validate-regression-risk-high-blast-refresh.ts: unsafe_unknown
- scripts/agent/validate-score-80-reconciliation-lock.ts: unsafe_unknown
- scripts/agent/validate-score-80-refresh-pass.ts: unsafe_unknown
- scripts/agent/validate-user-facing-feature-connection-audit.ts: unsafe_unknown
- src/lib/agent-score/algorithmic-evidence-policy.ts: unsafe_unknown
- src/lib/agent-score/core.ts: unsafe_unknown
- src/lib/agent-score/evidence-quality.ts: unsafe_unknown
- src/lib/agent-score/formal-evidence-bridge.ts: unsafe_unknown
- src/lib/agent-score/regression-risk-refresh-plan.ts: unsafe_unknown
- tests/unit/creator-dashboard-error-cost-inventory.spec.ts: unsafe_unknown
- tests/unit/creator-experiences-panel.spec.tsx: unsafe_unknown
- tests/unit/post-economy-creator-flow-qa.spec.ts: unsafe_unknown
- tests/unit/public-beta-score.spec.ts: unsafe_unknown
- tests/unit/purchase-modal.spec.tsx: unsafe_unknown

## Active Old Logic

- none

## Validation Failures

- dirty files unclassified.
