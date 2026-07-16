# PWA Service Worker Safety

Generated: 2026-07-16T04:26:11.547Z
Current head: 621afada2aea0ef269a02c7ac68d4424bfce5214
Status: pass

## Summary

- Service worker cache policy is public-shell-only.
- Wallet, payment, chat, private creator, auth/session, admin, and user payload routes are forbidden from service-worker caching.
- Offline fallback is public and must not present stale authenticated truth.
- Update availability, offline fallback use, install prompts, and registration states are telemetry/debug visible.
- This pass did not send push notifications, call providers, deploy, or change GumDrop/payment runtime.

## Debug Lane

- Lane: PWA/service worker
- Status: live
- Registered: true
- Update available: false
- Notification compatible: true
- Forbidden cache safe: true
- Offline fallback safe: true
- Stale shell risk: low

## Forbidden Cache Paths

- /api/paypal
- /api/checkout
- /api/wallet
- /api/chat
- /api/creator/messages
- /api/auth
- /api/user
- /api/notifications
- /api/admin
- /__/auth
- /__/firebase
- /dashboard/chat
- /dashboard/library
- /dashboard/wallet
- /wallet
- /checkout
- /admin
- /creator/private

## Score Impact

- sourceHealth: before=83.6; after=83.6; PWA service worker safety now has an explicit source contract, forbidden cache policy, telemetry map, unit test, and validator.
- runtimeHealth: before=50.22; after=50.22; Registration/update/offline states are wired for source-side telemetry and debug; deployed runtime smoke remains separate.
- evidenceCompleteness: before=45; after=45; Debug lane reports registration, update availability, notification compatibility, forbidden cache safety, offline fallback, and stale shell risk.
- freshness: before=59.38; after=59.38; PWA safety artifact is regenerated from current source at the current head.
- costRisk: before=92.5; after=92.5; No provider sends, deployment, production reads, or broad route fanout are performed.
- regressionRisk: before=94; after=94; Focused unit and validator coverage guard sensitive cache paths, update/offline telemetry, and debug visibility.
- overallHealthScore: before=63.18; after=63.18; Improves PWA readiness evidence without clearing formal runtime/provider gates.

## Old Logic Classification

- public/firebase-messaging-sw.js runtime cache: still_required_public_shell_only
- agent/state/pwa-service-worker-audit.generated.json: stale_generated_artifact_to_reuse_as_prior_evidence
- docs/agent-truth/pwa-service-worker-mobile.md: still_required_doctrine

## Dirty Files

- agent/state/notification-permission-lifecycle.generated.json: stale_generated_artifact_to_regenerate
- agent/state/notification-targeting-intent.generated.json: stale_generated_artifact_to_regenerate
- agent/state/push-token-registration.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/notification-permission-lifecycle.md: release_artifact_expected
- docs/agent-truth/notification-targeting-intent.md: release_artifact_expected
- docs/agent-truth/push-token-registration.md: release_artifact_expected

## Validation Failures

- none
