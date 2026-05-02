# Rollback And Incident Response

Status: launch incident-response plan  
Recorded: 2026-05-02  
Machine-readable audit: `agent/state/rollback-incident-response.generated.json`  
Validator: `npm run check:rollback-incident-response`

This plan explicitly covers the service worker stale app shell and analytics refresh storm launch incidents.

## Doctrine

Incident response starts with harm reduction and evidence preservation.

- Stop new harm before repairing historical data.
- Preserve provider, Firestore, route runtime, Debug, and deployment evidence before cleanup.
- Roll back the bad deploy when code or config caused the incident.
- Use existing guarded admin tools before manual DB intervention.
- Do not claim a kill switch exists unless it is verified in tracked code or configuration.
- Manual DB intervention must be written down when no protected product action exists.
- Do not delete payment, unlock, notification, queue, refresh, or admin evidence to make a dashboard look clean.

## Global Rollback Path

KandyDrops does not have a one-command rollback script in this repo.

When a deployed app revision caused the incident, use the Firebase/App Hosting console release history to move traffic back to the last known-good backend revision. If provider-console rollback is not available, create a reviewed revert commit:

```bash
git revert <bad_commit>
```

Then let the normal GitHub/App Hosting deployment path deploy the revert after incident-specific validation passes.

Before redeploy when time permits:

- `npm run check:deployment`
- `npm run typecheck`
- `npm run check:functions` if Functions changed
- `npm run check:firebase:rules` if Firebase rules changed
- the incident-specific validation from the table below

Provider-console actions must be recorded with actor, time, affected service, and reason.

## Real Switch Inventory

These are verified levers. They are not broader than stated.

| Lever | Scope | Verified files | Limitation |
| --- | --- | --- | --- |
| PayPal client readiness | Partial deploy-time checkout stop | `src/components/PurchaseModal.tsx`, `src/components/PayPalProvider.tsx`, `apphosting.yaml` | Hides checkout when client id is absent after deploy; does not stop authenticated capture for already-created orders. |
| Admin Drop queue toggle | Per-Drop queue membership | `src/app/api/admin/queue/toggle/route.ts`, `src/lib/server/drop-queue.ts` | Does not pause scheduled Functions globally or undo sent notifications. |
| Analytics refresh dedupe | Refresh storm mitigation | `src/app/api/admin/analytics/refresh/route.ts`, `src/lib/server/admin-analytics-snapshots.ts` | Prevents duplicate refreshes per module/range; does not disable all refresh jobs. |
| Notification user preferences | Per-recipient skip behavior | `src/lib/server/fcm-utils.ts`, notification runtime/docs | Not a global push kill switch. |
| Service-worker cache versioning | Deploy mitigation | `public/firebase-messaging-sw.js`, `src/lib/firebase-messaging.ts` | Requires a deploy or user refresh; not a live runtime switch. |
| Creator messaging settings | Per-creator availability | `src/lib/server/chat.ts`, `src/lib/creator-experiences.ts` | Not a global chat kill switch. |
| Storage direct-read deny | Baseline protection | `storage.rules`, `/api/drops/content` | Does not revoke already leaked external URLs. |

## Incident Playbooks

### Payments Broken

Detection signal: Wallet checkout errors, PayPal create/capture warnings, failed purchase transactions, support reports, or live smoke purchase failure.

User impact: Fans cannot refill GumDrops or may abandon checkout before a server-confirmed purchase completes.

Immediate mitigation: Stop visible checkout through PayPal client readiness in the next deploy or roll back App Hosting to the last known-good revision. Do not manually credit until PayPal order evidence is verified.

Switch available: partial deploy-time PayPal client readiness. No server-side capture kill switch exists.

Manual fallback: Use Admin Users and transaction history. Credit only verified completed orders through the audited admin balance route with a support reason.

Rollback path: Firebase/App Hosting console rollback, or reviewed `git revert <bad_commit>` followed by normal deployment.

Data recovery:

- Collect order id, PayPal capture id, user id, package, paid amount, route warning, and transaction rows.
- Confirm PayPal status and `custom_id` user/package binding.
- If paid and not credited, use admin balance adjustment.
- If not paid or capture failed, do not credit.
- Reconcile commerce parity after recovery.

User note: Checkout is temporarily unavailable while payment processing is verified. Completed payments will be reviewed from provider receipts before balance correction.

Postmortem evidence: deployment revision, order ids, capture ids, `custom_id` verification, payment locks, transactions, route warnings, affected packages.

### Wallet Crediting Broken

Detection signal: Completed PayPal captures without matching `paymentLocks` or transactions, balance mismatch, purchase parity warning, or support report that paid GumDrops did not appear.

User impact: A fan may have paid but not received GumDrops.

Immediate mitigation: Stop new checkout through PayPal client readiness deploy or App Hosting rollback. Reconcile completed orders from PayPal provider truth.

Switch available: partial deploy-time checkout stop only.

Manual fallback: Use audited admin balance adjustment for verified paid orders.

Rollback path: App Hosting rollback or reviewed revert. Run payment/unlock security validation before redeploy.

Data recovery:

- Export payment locks, transactions, failed transactions, route warnings, and PayPal captures.
- Verify user/package `custom_id` and expected USD amount.
- Apply audited admin balance adjustment with order/support reason.
- Treat already-credited orders as no-op.

User note: A wallet credit delay was found. Verified completed payments will be credited from provider records.

Postmortem evidence: PayPal capture response, payment lock existence, balance before/after, admin adjustment transaction id, commerce parity.

### Unlock Double-Charge

Detection signal: Duplicate `unlock_content` transactions for the same user/Drop, balance double-deduction report, unlock parity mismatch, or ledger anomaly.

User impact: A fan may lose extra GumDrops for one Drop unlock.

Immediate mitigation: Roll back the bad deploy or temporarily block unlock entry points with a reviewed emergency deploy if rollback is not enough. Preserve all ledger evidence.

Switch available: none. The unlock route is transactional and idempotent by `unlockedContent`, but no runtime off switch exists. No global unlock kill switch exists.

Manual fallback: Manual DB intervention may be required if corrective admin balance adjustment is not sufficient. Prefer an audited balance refund transaction.

Rollback path: App Hosting rollback or reviewed revert. Run unlock idempotency validation before redeploy.

Data recovery:

- Identify duplicate transactions by user id, Drop id, and timestamp.
- Compare `unlockedContent` and `unlockedContentTimestamps`.
- Refund only the excess deduction through admin balance adjustment.
- Do not delete transaction evidence.

User note: An unlock charge issue was found. Extra GumDrops will be returned after the ledger is verified.

Postmortem evidence: user id, Drop id, duplicate transaction ids, balance before/after, entitlement state, deployment revision.

### Locked Content Leak

Detection signal: Protected asset URL appears in public payload, unauthenticated Storage access succeeds, content proxy serves without entitlement, or a locked media exposure report arrives.

User impact: Protected creator content may be visible to users without entitlement.

Immediate mitigation: Roll back the leaking deploy, redeploy deny-by-default Storage rules if rules changed, remove public payload exposure, and rotate or revoke exposed media URLs where provider controls allow.

Switch available: baseline Storage deny and entitlement proxy protection only. No live content-leak kill switch exists.

Manual fallback: Manual DB intervention or Storage provider intervention is required to remove, rotate, replace, or temporarily unpublish affected media.

Rollback path: Firebase rules rollback/deploy from known-good `storage.rules` plus App Hosting rollback for public payload leaks.

Data recovery:

- Record affected Drop ids, asset URLs, route payload evidence, and user reports.
- Verify public routes no longer return `contentUrl` or `contentUrls`.
- Disable/archive affected Drops if URLs cannot be revoked immediately.
- Replace leaked assets or move them to a new protected path.

User note: Access to the affected Drop is temporarily limited while protected media is secured.

Postmortem evidence: Drop ids, asset paths, public route payload, rules version, content proxy logs, first exposure time.

### Notifications Duplicate Or Spam

Detection signal: Duplicate notification records, repeated browser alerts with the same tag/idempotency key, FCM duplicate diagnostics, user reports, or Admin Debug duplicate counts.

User impact: Fans may receive repeated alerts and lose trust.

Immediate mitigation: Stop the offending notification source. Remove affected Drops from queue, roll back the deploy, or pause the scheduled trigger externally. Do not bulk resend until idempotency evidence is verified.

Switch available: partial. Admin Drop queue toggle and user preferences can reduce the source or recipients. No global notification kill switch exists.

Manual fallback: Manual DB intervention may be required to mark duplicate notification records read/cleared or inspect `notificationDispatchLocks`. Export evidence first.

Rollback path: App Hosting/Functions rollback or reviewed revert. If scheduled Functions are the source, pause the scheduler in provider console until a reviewed fix deploys.

Data recovery:

- Collect notification ids, idempotency keys, browser tags, dispatch locks, activation keys, and FCM report counts.
- Classify duplicates as in-app records, browser display, or FCM sends.
- Remove affected Drops from queue when live/return-live loop is the source.
- Mark duplicates read or cleared only after export.

User note: Some alerts repeated. The affected send path was stopped and duplicates are being cleaned without changing Drop access.

Postmortem evidence: idempotency keys, browser tags, dispatch locks, activation key, FCM counts, queue heartbeat.

### Notifications Missing

Detection signal: Eligible users skipped unexpectedly, missing notification records, FCM missing-token/preference/permission skip counts, user reports, or Debug funnel drop-off.

User impact: Fans may miss queued/live Drop, task, or account notifications.

Immediate mitigation: Do not mass-resend immediately. Verify eligibility, preferences, tokens, idempotency locks, and dispatch outcome. Re-run only the minimal safe send path after duplicate prevention is confirmed.

Switch available: none. Admin-created notifications exist, but historical per-recipient replay is not a safe one-click recovery tool.

Manual fallback: Manual DB intervention is required for historical replay or per-recipient repair unless a protected admin-created notification is appropriate.

Rollback path: Roll back the notification deploy if code caused missing sends. Pause source jobs only if retries would amplify harm.

Data recovery:

- Classify missing reason: permission, token, preference, dispatch failure, queue bug, or eligibility bug.
- Collect recipient ids, notification ids, idempotency keys, preference state, token state, and FCM report.
- If resend is needed, target only eligible affected users with deterministic keys.
- Update Admin Debug notes with skipped reason; do not fake zero counts.

User note: Some alerts may have been delayed or missed. Eligibility is being verified before any replacement alert.

Postmortem evidence: recipient ids, permission/preference/token state, FCM report, notification records, dispatch locks, Debug funnel.

### Analytics Refresh Storm

Detection signal: `duplicate_prevented` warnings spike, refresh route latency/errors, materializer load, route runtime warnings, or refresh status stuck running in Admin Debug.

User impact: Admin surfaces may slow down or show delayed diagnostics, but verified snapshots should remain visible.

Immediate mitigation: Stop manual refresh traffic, restrict admin refresh use, let dedupe settle, and roll back the bad deploy if refresh loops were introduced.

Switch available: refresh dedupe mitigation only. No global analytics-refresh-off switch exists.

Manual fallback: Manual DB intervention may be required to mark a stuck refresh failed only after preserving metadata.

Rollback path: App Hosting rollback or reviewed revert. If scheduled Functions cause load, pause that trigger in provider console and document actor/time.

Data recovery:

- Export snapshot metadata for affected module/range cache keys.
- Verify `lastVerifiedAt` and `refreshVersion`.
- Keep last verified snapshots visible.
- After fix, run one forced refresh per affected module/range and record metadata.

User note: Admin analytics refresh is delayed. Last verified data remains available while refresh is stabilized.

Postmortem evidence: cache key, module key, range key, refresh timestamps/status, duplicate prevention, route samples, deployment revision.

### Admin Route Or Security Issue

Detection signal: Non-admin access to `/admin` or `/api/admin/**`, missing trusted-origin guard on state-changing route, security alert, suspicious admin mutation, or role-boundary validation failure.

User impact: Private admin data or state-changing controls may be exposed to the wrong actor.

Immediate mitigation: Roll back immediately, revoke affected admin/session credentials, tighten roles, and deploy known-good guards/rules if the boundary broke.

Switch available: guards are baseline protection, not a runtime switch.

Manual fallback: Manual DB intervention or provider-console action may be required to remove admin claims, disable users, rotate secrets, audit affected records, or redeploy rules.

Rollback path: Immediate App Hosting rollback plus Firebase rules rollback/deploy when rules changed.

Data recovery:

- Collect route, actor uid, auth claims, origin, method, mutation ids, and affected records.
- Revoke or rotate compromised credentials.
- Audit admin mutation logs and transaction rows.
- Notify affected parties if sensitive data was exposed.

User note: Admin access is being locked down while protected system routes are verified.

Postmortem evidence: route path, method, uid/claims, origin, mutation ids, Firebase rules version, deployment revision.

### Service Worker Stale App Shell

Detection signal: Users continue seeing old UI after deploy, offline fallback appears for valid routes, cache names are stale, or PWA smoke fails.

User impact: Mobile/PWA users may use stale UI or stale route assets.

Immediate mitigation: Deploy a cache-version bump and known-good service worker, or roll back to the last known-good revision. Ask affected users to close/reopen or refresh if needed.

Switch available: deploy mitigation through `APP_SHELL_CACHE`, `APP_RUNTIME_CACHE`, `skipWaiting`, and `clients.claim`.

Manual fallback: No DB intervention is needed unless stale UI caused data writes. Support can guide close/reopen, browser site-data clear, or install refresh.

Rollback path: App Hosting rollback for a bad shell, or deploy a service-worker cache-name bump after `npm run check:pwa-service-worker`.

Data recovery:

- Verify cache names and service-worker scope.
- Confirm API routes are not cached and navigation is network-first.
- Bump cache names when shell/offline assets change.
- Collect affected browser, device, PWA context, and route.

User note: A mobile app refresh may be needed. Close and reopen KandyDrops, or refresh the browser tab, to load the latest version.

Postmortem evidence: cache names, service-worker URL, browser/device, route, revision, offline fallback evidence.

### Drop Queue Malfunction

Detection signal: Queued Drops fail to activate, active Drops fail to expire, auto-queued Drops loop, queue heartbeat warnings, duplicate return-live notifications, or Admin Drops schedule mismatch.

User impact: Fans may see wrong Drop availability or receive wrong live/return-live alerts.

Immediate mitigation: Remove affected Drops from queue with admin queue toggle, pause scheduled queue processing externally if it amplifies harm, and roll back a bad queue deploy.

Switch available: partial per-Drop queue toggle.

Manual fallback: Manual DB intervention may be required to correct `adminSettings/dropQueue`, Drop timing/status, or activation keys after evidence export.

Rollback path: App Hosting/Functions rollback or reviewed revert. Run background-job idempotency and Admin CMS workflow validation before redeploy.

Data recovery:

- Export queue config, affected Drop docs, queue heartbeats, runtime warnings, activation keys, and dispatch outcomes.
- Remove problematic Drops from queue or reset queue order.
- Correct Drop timing/status only with explicit reason and before/after snapshot.
- Re-run queue lifecycle and verify no duplicate dispatch.

User note: A Drop schedule issue is being corrected. Availability may update while the queue is reconciled.

Postmortem evidence: Drop ids, queue config, timing/status, queue heartbeat, activation key, notification outcome.

### Chat Outage

Detection signal: Chat thread/message route errors, participant authorization failures, creator messaging unavailable reports, send latency, or route runtime failures.

User impact: Fans and creators may be unable to send or read messages.

Immediate mitigation: Roll back bad chat route changes. For creator-specific issues, adjust existing creator messaging settings/restrictions if tooling supports it. Do not expose chat transcripts broadly.

Switch available: partial per-creator messaging availability. No global chat kill switch exists.

Manual fallback: Manual DB intervention may be required to repair a thread, participant id, read marker, or creator setting.

Rollback path: App Hosting rollback or reviewed revert. Run chat route and security boundary validation before redeploy.

Data recovery:

- Collect thread id, sender uid, creator/user participant ids, route error, and transaction/accrual evidence if a paid message failed.
- Verify participant authorization before exposing records.
- Refund paid message cost with audited balance adjustment only if spend occurred without message delivery.
- Repair metadata only with before/after evidence.

User note: Creator messaging is temporarily delayed. Paid message issues will be checked against the chat and wallet ledger.

Postmortem evidence: thread id, message id, participants, route runtime sample, transaction id, creator settings, deployment revision.

### Creator Profile 404 Spike

Detection signal: Creator profile not-found spike, support reports, username lookup failures, public Drops missing for active creators, or creator routing telemetry anomaly.

User impact: Fans may be unable to open creator profiles or public creator Drops.

Immediate mitigation: Roll back route/profile changes, repair username/status/role data for affected creators, and verify public payload sanitization remains intact.

Switch available: none. Creator 404 repair is data/deploy recovery, not a flag.

Manual fallback: Manual DB intervention may be required to repair username, role, status, creator settings, or public Drop metadata.

Rollback path: App Hosting rollback or reviewed revert. Run creator profile/content media/security validations before redeploy.

Data recovery:

- Collect usernames, creator uids, role/status fields, creator settings, and public Drop ids.
- Verify creator is public and active before changing routing data.
- Repair username/profile data or route regression.
- Confirm public route returns sanitized Drops only.

User note: Some creator profiles may be temporarily unavailable while routing is corrected.

Postmortem evidence: username, creator uid, role/status, route status, public Drop ids, deployment revision.

## Future Agent Rules

- Do not add a new emergency switch without documenting scope, owner, safe default, audit trail, and tests.
- Do not use App Hosting/CDN caching as a private admin data recovery tool.
- Do not call old verified data unusable solely because it is old; label it stale and preserve it.
- Do not clear snapshots, payment locks, transaction rows, notification locks, queue heartbeats, or route warnings during first response.
- Do not make support or admin copy say an incident is resolved until the recovery evidence is in Debug or the support ledger.
