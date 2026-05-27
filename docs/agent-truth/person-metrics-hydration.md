# Person Metrics Hydration

Generated: 2026-05-27T04:17:23.263Z
Status: pass
Current head: e6ca135231406a07d92742aadf4d535279dc9961

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

- AGENTS.md: real_source_change_needs_review
- CHANGELOG.md: release_artifact_expected
- REPO_MEMORY_LEDGER.md: real_source_change_needs_review
- agent/index/known-pitfalls.json: real_source_change_needs_review
- agent/state/client-state-ownership.generated.json: current_generated_artifact_to_commit
- agent/state/codex-frontend-memory-writeback.generated.json: current_generated_artifact_to_commit
- agent/state/event-translation-bridge.generated.json: current_generated_artifact_to_commit
- agent/state/frontend-component-consolidation.generated.json: current_generated_artifact_to_commit
- agent/state/frontend-gut-consolidation.generated.json: current_generated_artifact_to_commit
- agent/state/frontend-telemetry-consolidation.generated.json: current_generated_artifact_to_commit
- agent/state/hydration-race-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/person-metrics-hydration.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/client-state-ownership.md: documentation_artifact_expected
- docs/agent-truth/codex-frontend-memory-writeback.md: documentation_artifact_expected
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/frontend-component-consolidation.md: documentation_artifact_expected
- docs/agent-truth/frontend-gut-consolidation.md: documentation_artifact_expected
- docs/agent-truth/frontend-telemetry-consolidation.md: documentation_artifact_expected
- docs/agent-truth/hydration-race-cleanup.md: documentation_artifact_expected
- docs/agent-truth/person-metrics-hydration.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-client-state-ownership.ts: validator_artifact_expected
- scripts/agent/validate-codex-frontend-memory-writeback.ts: validator_artifact_expected
- scripts/agent/validate-frontend-component-consolidation.ts: validator_artifact_expected
- scripts/agent/validate-frontend-telemetry-consolidation.ts: validator_artifact_expected
- scripts/agent/validate-hydration-race-cleanup.ts: validator_artifact_expected
- src/components/Support/SupportInbox.tsx: real_source_change_needs_review
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/frontend-hardening/client-state-ownership.ts: real_source_change_needs_review
- src/lib/frontend-hardening/component-bloat-audit.ts: real_source_change_needs_review
- src/lib/frontend-hardening/frontend-surface-inventory.ts: real_source_change_needs_review
- src/lib/frontend-hardening/frontend-telemetry-usage.ts: real_source_change_needs_review
- src/lib/frontend-hardening/hydration-race-guard.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/client-state-ownership.spec.ts: test_artifact_expected
- tests/unit/codex-frontend-memory-writeback.spec.ts: test_artifact_expected
- tests/unit/frontend-component-consolidation.spec.ts: test_artifact_expected
- tests/unit/frontend-telemetry-consolidation.spec.ts: test_artifact_expected
- tests/unit/hydration-race-cleanup.spec.ts: test_artifact_expected

## Active Old Logic

- none

## Validation Failures

- none
