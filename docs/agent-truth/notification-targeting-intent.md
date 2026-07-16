# Notification Targeting Intent

Generated: 2026-07-16T04:26:07.357Z
Current head: 621afada2aea0ef269a02c7ac68d4424bfce5214
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

- sourceHealth: before=83.6; after=83.6; Notification targeting now has explicit intent contracts for drops, broadcasts, chat, tasks, Fan Pass, wallet, system, and support notices.
- runtimeHealth: before=50.22; after=50.22; Provider delivery remains unclaimed; this phase validates dry-run delivery intent only.
- evidenceCompleteness: before=45; after=45; Targeting rules expose opt-out, missing-token, consent, audience-source, and dry-run eligibility states to debug evidence.
- freshness: before=59.38; after=59.38; Notification targeting intent report is regenerated from current source.
- costRisk: before=92.5; after=92.5; No production fanout, provider send, or push test execution is performed.
- regressionRisk: before=94; after=94; Unit and source validators cover sender exclusion, creator audience settings, task eligibility, opt-out, token, consent, dedupe, and debug mapping.
- overallHealthScore: before=63.18; after=63.18; Improves notification readiness evidence without clearing formal runtime/provider gates.

## Dirty Files

- agent/state/notification-permission-lifecycle.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/notification-permission-lifecycle.md: release_artifact_expected

## Validation Failures

- none
