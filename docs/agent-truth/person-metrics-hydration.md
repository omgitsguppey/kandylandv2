# Person Metrics Hydration

Generated: 2026-05-26T08:13:08.353Z
Status: pass
Current head: a74f489c81e605f1c9a280f28726d352fcb54dee

## Contract

- Person metrics hydrate from canonical event envelopes and dry-run legacy candidates only when the candidate is safe.
- Unknown legacy evidence never becomes exact user truth.
- Checkout starts remain checkout intent, not payment approval.
- Page duration never becomes watch time; watch sessions require runtime watch events.
- Missing future activity is shown as collecting/unavailable with the exact producer event, not fake zero.

## Debug Lane

- Producers registered: 258
- Producers connected: 36
- Event envelopes hydrated: 49
- Person metrics mapped: 36
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

- CHANGELOG.md: release_artifact_expected
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/body-system-wiring-repair.generated.json: current_generated_artifact_to_commit
- agent/state/central-normalizer-spine.generated.json: current_generated_artifact_to_commit
- agent/state/current-beta-exit-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-backlog-engine.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-translation-bridge.generated.json: current_generated_artifact_to_commit
- agent/state/feature-registration-gate.generated.json: current_generated_artifact_to_commit
- agent/state/final-product-integrity-lock.generated.json: current_generated_artifact_to_commit
- agent/state/interpretive-brain-debug-triage.generated.json: current_generated_artifact_to_commit
- agent/state/overnight-beta-readiness-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: current_generated_artifact_to_commit
- agent/state/product-body-map.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: stale_generated_artifact_to_regenerate
- agent/state/sql-database-parity-cost-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/surface-parity-doctrine.generated.json: stale_generated_artifact_to_regenerate
- agent/state/surface-telemetry-parity.generated.json: current_generated_artifact_to_commit
- agent/state/user-journey-behavioral-intelligence.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/body-system-wiring-repair.md: documentation_artifact_expected
- docs/agent-truth/central-normalizer-spine.md: documentation_artifact_expected
- docs/agent-truth/current-beta-exit-status.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-backlog-engine.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/final-product-integrity-lock.md: documentation_artifact_expected
- docs/agent-truth/interpretive-brain-debug-triage.md: documentation_artifact_expected
- docs/agent-truth/overnight-beta-readiness-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/person-metrics-hydration.md: documentation_artifact_expected
- docs/agent-truth/product-body-map.md: documentation_artifact_expected
- docs/agent-truth/sql-database-parity-cost-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/surface-parity-doctrine.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/surface-telemetry-parity.md: documentation_artifact_expected
- docs/agent-truth/user-journey-behavioral-intelligence.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-final-product-integrity-lock.ts: validator_artifact_expected
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/product-integrity/body-system-wiring-repair.ts: real_source_change_needs_review
- src/lib/product-integrity/central-normalizer.ts: real_source_change_needs_review
- src/lib/product-integrity/final-product-integrity-lock.ts: real_source_change_needs_review
- src/lib/product-integrity/interpretive-brain.ts: real_source_change_needs_review
- src/lib/product-integrity/product-body-map.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/final-product-integrity-lock.spec.ts: test_artifact_expected

## Active Old Logic

- none

## Validation Failures

- none
