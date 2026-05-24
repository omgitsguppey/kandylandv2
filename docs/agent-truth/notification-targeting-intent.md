# Notification Targeting Intent

Generated: 2026-05-24T06:54:54.639Z
Current head: 2180b062
Status: pass

## Contract

- This is delivery-intent truth only; it does not execute provider sends.
- Targeting requires permission, push token presence, opt-in settings, consent eligibility, audience source, dedupe, throttle, telemetry, and debug visibility.
- Chat notifications target recipients only, never the sender.
- Creator broadcasts respect creator audience settings.
- Daily task reminders require task eligibility and reset truth.
- Notification payload policy forbids raw PII and raw push tokens.

## Intents

- drop_live: audience=global_drop_audience; optIn=new_drop_alerts_enabled; consent=minimal_analytics_or_stronger; route=/drops
- drop_expiring: audience=global_drop_audience; optIn=expiring_drop_alerts_enabled; consent=minimal_analytics_or_stronger; route=/drops
- drop_unwrapped: audience=drop_unwrapper; optIn=drop_activity_alerts_enabled; consent=minimal_analytics_or_stronger; route=/dashboard/library
- creator_broadcast: audience=creator_followers_or_subscribers; optIn=creator_broadcasts_enabled; consent=minimal_analytics_or_stronger; route=/creators/{creatorUsername}
- fan_pass_update: audience=fan_pass_subscribers; optIn=fan_pass_updates_enabled; consent=minimal_analytics_or_stronger; route=/dashboard/profile
- chat_message: audience=chat_thread_recipient; optIn=chat_notifications_enabled; consent=minimal_analytics_or_stronger; route=/dashboard/chat
- chat_paid_gd_gate: audience=chat_thread_recipient; optIn=chat_notifications_enabled; consent=minimal_analytics_or_stronger; route=/dashboard/chat
- daily_task_available: audience=daily_task_eligible_users; optIn=daily_task_reminders_enabled; consent=minimal_analytics_or_stronger; route=/experiences
- daily_task_streak: audience=daily_task_eligible_users; optIn=daily_task_reminders_enabled; consent=minimal_analytics_or_stronger; route=/experiences
- wallet_payment_success: audience=wallet_account_owner; optIn=wallet_updates_enabled; consent=required_account_integrity; route=/dashboard/profile
- system_security: audience=system_account_owner; optIn=security_alerts_enabled; consent=required_account_integrity; route=/settings
- support_update: audience=support_thread_participant; optIn=support_updates_enabled; consent=required_account_integrity; route=/dashboard/support

## Debug Lane

- Intent types registered: 12
- Missing audience source: 0
- Blocked by opt-out: 0
- Blocked by missing token: 1
- Blocked by consent: 0
- Dry-run eligible: 1
- Telemetry: mapped

## Score Impact

- sourceHealth: before=92.5; after=92.5; Notification targeting now has explicit intent contracts for drops, broadcasts, chat, tasks, Fan Pass, wallet, system, and support notices.
- runtimeHealth: before=84.2; after=84.2; Provider delivery remains unclaimed; this phase validates dry-run delivery intent only.
- evidenceCompleteness: before=69.6; after=69.6; Targeting rules expose opt-out, missing-token, consent, audience-source, and dry-run eligibility states to debug evidence.
- freshness: before=83.75; after=83.75; Notification targeting intent report is regenerated from current source.
- costRisk: before=42; after=42; No production fanout, provider send, or push test execution is performed.
- regressionRisk: before=86; after=86; Unit and source validators cover sender exclusion, creator audience settings, task eligibility, opt-out, token, consent, dedupe, and debug mapping.
- overallHealthScore: before=79.25; after=79.25; Improves notification readiness evidence without clearing formal runtime/provider gates.

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/state/feature-registration-gate.generated.json: stale_generated_artifact_to_regenerate
- agent/state/notification-targeting-intent.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/feature-registration-gate.md: release_artifact_expected
- docs/agent-truth/notification-targeting-intent.md: release_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-notification-targeting-intent.ts: validator_artifact_expected
- src/lib/analytics/person-metrics-contract.ts: real_source_change_needs_review
- src/lib/debug/debug-panel-tracking-summary.ts: real_source_change_needs_review
- src/lib/notifications/notification-intent-contract.ts: real_source_change_needs_review
- src/lib/notifications/notification-targeting-resolver.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- src/lib/telemetry-catalog.ts: real_source_change_needs_review
- tests/unit/notification-targeting-intent.spec.ts: test_artifact_expected

## Validation Failures

- none
