# Privacy Behavior Legacy Recovery

Generated: 2026-07-14T07:07:51.306Z

This is a dry-run recovery contract for legacy and orphaned privacy/behavior records from March 1, 2026 onward. It does not read production data, run live backfill, mutate records, or promote unknown legacy consent into full behavioral tracking.

## Contract

- Recovery start date: 2026-03-01
- Mode: dry_run_only
- Production reads: false
- Live backfill: false
- Mutations allowed: false
- Current truth eligible records: 0
- Requires user confirmation: 2

## Legacy Classes

- legacy_consent_unknown
- legacy_guest_behavior_unknown
- legacy_user_behavior_probable
- orphaned_guest_session
- orphaned_user_event
- orphaned_materialized_metric
- orphaned_profile_drop_interaction
- legacy_cookie_banner_state

## Debug/Admin Visibility

- Recovery readiness: ready_for_dry_run_review
- Orphan counts: {"orphaned_guest_session":1,"orphaned_user_event":1,"orphaned_materialized_metric":1,"orphaned_profile_drop_interaction":1}
- Cannot safely recover: legacy_consent_unknown, legacy_cookie_banner_state, legacy_guest_behavior_unknown, orphaned_materialized_metric
- Unsafe reason: Unknown consent, orphaned metrics, and high-duplicate-risk rows stay archive-only and visible to debug/admin truth.

## Validation

- FAIL: protected chat/nav/payment files changed: agent/state/gumdrop-economy-accuracy.generated.json, agent/state/gumdrop-economy-score.generated.json, agent/state/wallet-packages-route-repair.generated.json, scripts/agent/validate-chat-paid-gumdrops-guidance.ts, scripts/agent/validate-payment-unlock-security.ts, src/app/api/chat/attachments/cancel/route.ts, src/app/api/chat/attachments/complete/route.ts, src/app/api/chat/attachments/prepare/route.ts, src/app/api/chat/threads/[threadId]/messages/route.ts, src/app/api/paypal/capture/route.ts, src/app/api/paypal/create/route.ts, src/app/api/wallet/packages/route.ts, src/components/Chat/ChatExperience.tsx, src/components/Navigation/ProfileDropdown.tsx, src/lib/server/paypal.ts, tests/unit/paypal-capture-route.spec.ts, tests/unit/wallet-packages-route-repair.spec.ts
