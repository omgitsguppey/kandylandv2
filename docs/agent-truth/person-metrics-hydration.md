# Person Metrics Hydration

Generated: 2026-05-23T05:09:21.360Z
Status: pass
Current head: fa929bd2cbbf640bd1f2f17cd15940306ffdd3e3

## Contract

- Person metrics hydrate from canonical event envelopes and dry-run legacy candidates only when the candidate is safe.
- Unknown legacy evidence never becomes exact user truth.
- Checkout starts remain checkout intent, not payment approval.
- Page duration never becomes watch time; watch sessions require runtime watch events.
- Missing future activity is shown as collecting/unavailable with the exact producer event, not fake zero.

## Debug Lane

- Producers registered: 80
- Producers connected: 23
- Event envelopes hydrated: 32
- Person metrics mapped: 23
- Low-confidence metrics: 4
- Gaps: 0

## Metric Hydration

- sessions: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- visits: state=hydrated; count=3; confidence=exact; provenZero=false; missing=none
- active_days: state=hydrated; count=5; confidence=exact; provenZero=false; missing=none
- page_views: state=hydrated; count=3; confidence=exact; provenZero=false; missing=none
- creator_profile_views: state=hydrated; count=1; confidence=linked; provenZero=false; missing=none
- drop_opens: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- unwraps: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- wallet_opens: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- wallet_closes: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- package_selections: state=hydrated; count=1; confidence=linked; provenZero=false; missing=none
- checkout_starts: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- payment_approvals: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- payment_cancels: state=hydrated; count=2; confidence=exact; provenZero=false; missing=none
- payment_failures: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- fan_pass_views: state=hydrated; count=1; confidence=linked; provenZero=false; missing=none
- fan_pass_purchases: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- broadcasts_viewed: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- broadcasts_clicked: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- follows: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- notification_interactions: state=hydrated; count=1; confidence=linked; provenZero=false; missing=none
- runtime_watch_sessions: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- settings_actions: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none
- support_account_actions: state=hydrated; count=1; confidence=exact; provenZero=false; missing=none

## Score Impact

- sourceHealth: before=80; after=84; Person metrics hydrate from canonical envelopes with missing future activity reported as collecting instead of fake zero.
- runtimeHealth: before=80; after=83; Person metrics hydrate from canonical envelopes with missing future activity reported as collecting instead of fake zero.
- evidenceCompleteness: before=80; after=84; Person metrics hydrate from canonical envelopes with missing future activity reported as collecting instead of fake zero.
- freshness: before=80; after=84; Person metrics hydrate from canonical envelopes with missing future activity reported as collecting instead of fake zero.
- costRisk: before=80; after=84; Hydration is source-only and does not add production reads or live data mutation.
- regressionRisk: before=80; after=84; Person metrics hydrate from canonical envelopes with missing future activity reported as collecting instead of fake zero.

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/state/person-metrics-contract.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/person-metrics-contract.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/person-metrics-hydration.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/score-public-beta-readiness.ts: real_source_change_needs_review
- scripts/agent/validate-person-metrics-hydration.ts: validator_artifact_expected
- scripts/agent/validate-public-beta-score.ts: validator_artifact_expected
- src/app/api/admin/debug/route.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-contract.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/debug/debug-panel-tracking-summary.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- src/lib/server/admin-debug/summary.ts: real_source_change_needs_review
- tests/unit/debug-tracking-simplification.spec.ts: test_artifact_expected
- tests/unit/person-metrics-contract.spec.ts: test_artifact_expected
- tests/unit/person-metrics-hydration.spec.ts: test_artifact_expected

## Active Old Logic

- none

## Validation Failures

- none
