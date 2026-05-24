# Person Metrics Hydration

Generated: 2026-05-24T09:25:08.358Z
Status: pass
Current head: 309d6b03a6e4aa5d47233d04cfb404991b75a8a8

## Contract

- Person metrics hydrate from canonical event envelopes and dry-run legacy candidates only when the candidate is safe.
- Unknown legacy evidence never becomes exact user truth.
- Checkout starts remain checkout intent, not payment approval.
- Page duration never becomes watch time; watch sessions require runtime watch events.
- Missing future activity is shown as collecting/unavailable with the exact producer event, not fake zero.

## Debug Lane

- Producers registered: 177
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
- agent/state/auth-persistence-stability.generated.json: current_generated_artifact_to_commit
- agent/state/auth-provider-conflict-resolution.generated.json: current_generated_artifact_to_commit
- agent/state/auth-readiness-lock.generated.json: current_generated_artifact_to_commit
- agent/state/auth-runtime-telemetry.generated.json: current_generated_artifact_to_commit
- agent/state/current-beta-exit-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-tracking-simplification.generated.json: stale_generated_artifact_to_regenerate
- agent/state/email-password-auth-refactor.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-envelope-normalization.generated.json: stale_generated_artifact_to_regenerate
- agent/state/feature-registration-gate.generated.json: stale_generated_artifact_to_regenerate
- agent/state/identity-handoff-spine.generated.json: stale_generated_artifact_to_regenerate
- agent/state/overnight-beta-readiness-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/auth-persistence-stability.md: documentation_artifact_expected
- docs/agent-truth/auth-provider-conflict-resolution.md: documentation_artifact_expected
- docs/agent-truth/auth-readiness-lock.md: documentation_artifact_expected
- docs/agent-truth/auth-runtime-telemetry.md: documentation_artifact_expected
- docs/agent-truth/current-beta-exit-status.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-tracking-simplification.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/email-password-auth-refactor.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/event-envelope-normalization.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/identity-handoff-spine.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/overnight-beta-readiness-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/person-metrics-hydration.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-auth-persistence-stability.ts: validator_artifact_expected
- scripts/agent/validate-auth-provider-conflict-resolution.ts: validator_artifact_expected
- scripts/agent/validate-auth-readiness-lock.ts: validator_artifact_expected
- scripts/agent/validate-auth-runtime-telemetry.ts: validator_artifact_expected
- scripts/agent/validate-email-password-auth-refactor.ts: validator_artifact_expected
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/auth-readiness-lock.spec.ts: test_artifact_expected

## Active Old Logic

- none

## Validation Failures

- none
