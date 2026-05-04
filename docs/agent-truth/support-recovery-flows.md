# Support Recovery Flows

Status: Launch support and recovery doctrine  
Last updated: 2026-05-01  
Evidence: `agent/state/support-recovery-flow-audit.generated.json`

## Doctrine

Support recovery must be evidence-first. Operators should be able to answer three questions before taking action:

1. What did the user say happened?
2. What does the app ledger or diagnostic source prove?
3. What action is safe, audited, and reversible enough for launch?

Do not invent balance, entitlement, notification, or account state from client reports. Recovery actions that affect money, access, notifications, or account status must be server-confirmed, admin-protected, and logged. If no product-safe action exists, the support note must say manual DB intervention is required and explain the risk.

KandyDrops debug evidence is structured, fingerprinted, stored, and injected into deterministic audits. Runtime issues already detected by the app must become pre-catcher issue candidates before relying on manual bug reports. Support uses one unified inbox model, with admin routes able to list/read/reply to all support threads and users scoped only to their own threads. Debug evidence writes must never block user flows.

Admin Support Workspace truth comes from the admin support API routes, not direct client Firestore listeners. The canonical inbox model is `support_threads/{threadId}` with nested `support_messages/{messageId}`. Admin routes may list/read/reply to all support threads after `auth: "admin"` and trusted-origin checks. User routes may list/read/reply only to the caller's own threads. Permission failures must produce human-readable operational copy and structured debug evidence.

## Operator Paths

Use these primary admin surfaces:

- Admin Users: search by email, username, or UID; inspect balance, notification preference, unlocked Drop count, status, and account actions.
- Admin User Detail: inspect Action Ledger, purchase/unlock rows, support handoff, security summary, creator handoff, and recommendation/debug context.
- Transaction History modal: inspect recent transactions from `/api/admin/user/:userId`.
- Balance Adjustment modal: apply protected manual GD credit/debit with a required reason.
- Admin Support Workspace: inspect support threads, reply, and update support status.
- Admin Drops: inspect Drop metadata/media and send a new Drop notification when appropriate.
- Admin Analytics and Admin Debug: inspect notification funnel, duplicate prevention, dispatch outcomes, route/runtime diagnostics, and source truth.

## Scenario Map

### User paid but Gum Drops did not appear

Visibility: Admin can inspect the user ledger, failed purchase rows, PayPal capture metadata on purchase transactions, and route diagnostics.  
Action: Verify PayPal externally, confirm the app has no completed credit, then use Balance Adjustment for a manual GD credit with a clear reason.  
Audit: `admin_adjustment` transaction with `adjustedByUid`, `adjustedByEmail`, `adjustmentReason`, `adjustmentSource`, and `auditedServerSide`.  
Risk: High. Cash refunds remain outside the app.

### Gum Drops deducted but unlock failed

Visibility: Admin can compare `unlock_content` transaction rows against `unlockedContent` and `unlockedContentTimestamps`.  
Action: If a deduction exists without entitlement, use Admin Users content management to grant the Drop. If entitlement exists, debug viewer/content access.  
Audit: Admin grant creates a zero-amount `unlock_content` transaction with `grantSource: "admin"`.  
Risk: High because grant reason/admin identity metadata is not yet required on entitlement grants.

### Unlock exists but viewer access is missing

Visibility: Admin can verify user entitlement and protected content route behavior. `/api/drops/content` accepts either unlocked array membership or server-written timestamp evidence.  
Action: Confirm user entitlement, Drop content fields, and content route error. Repair entitlement or media only after evidence matches the user report.  
Audit: Re-granting entitlement requires the admin-grant transaction.  
Risk: Medium. A dedicated read-only entitlement comparison card is deferred.

### Viewer asset is missing or broken

Visibility: Drop records, CMS media fields, content proxy errors, and cover fallback behavior identify most failures.  
Action: Use Admin Drops/CMS to repair or replace media. If a protected URL host is not allowed, correct the stored URL rather than bypassing the proxy.  
Audit: CMS edits remain admin-protected. No separate asset repair audit row was identified.  
Risk: Medium. Asset health panel is deferred.

### Notification was duplicated

Visibility: Admin Debug and Analytics expose duplicate-created, duplicate-push, duplicate-browser-display, idempotency, and dispatch outcome evidence.  
Action: Inspect the dispatch outcome and idempotency key. Do not delete duplicate rows during launch without a separate recovery design.  
Audit: Notification dispatch outcomes and funnel Debug metadata.  
Risk: Medium.

### Notification was missing

Visibility: Admin Debug/Analytics expose sent/open/read/clear counts and skip counts for missing token, permission denied, and preference disabled. User detail shows push preference.  
Action: Diagnose first. A new Drop notification can be sent from Admin Drops, but historical notification replay is not a launch action.  
Audit: Admin-created notifications are guarded, idempotent, and locked by dispatch fingerprint.  
Risk: Medium.

### Chat message failed

Visibility: Support conversations are inspectable in Admin Support Workspace. Creator chat is participant-scoped; creator user detail summarizes creator thread/message records and route diagnostics record send failures.  
Action: Use Admin Support for support threads. For creator chat, inspect user/creator records and route diagnostics; do not bypass the participant boundary.  
Audit: Paid creator messages create transactions and creator accrual rows. Support replies record sender role and sender id.  
Risk: Medium.

### Creator profile returns 404

Visibility: Public creator profile returns 404 when username is missing, role is not creator-capable, status is not active, or active public Drops are absent. Admin Users can edit username and status; creator detail has a creator handoff.  
Action: Verify username, role, status, creator settings, and Drop creator assignment. Reactivate or correct username only when the account should be public.  
Audit: Username changes record `updatedBy`; status-change immutable audit row was not identified.  
Risk: Medium.

### User cannot log in

Visibility: Admin user detail shows account status, support channels, and security summary. Provider-level Firebase Auth issues remain outside the app UI.  
Action: Search by email/UID, inspect status/security, reactivate if suspension was wrong, and use Firebase Auth console for provider recovery.  
Audit: Status route is admin-guarded; no separate immutable status-change audit row was identified.  
Risk: High.

### Onboarding is stuck

Visibility: Admin user detail shows creator onboarding canonical/history, support readiness, notification preference state, and user profile evidence.  
Action: Use support thread and creator roster/admin handoff. General user onboarding reset is manual DB intervention until a protected reset route exists.  
Audit: Manual reset must be documented in support notes and DB audit trail if performed.  
Risk: Medium.

### Refund or manual credit scenario

Visibility: Admin can inspect purchase rows and PayPal order/capture metadata stored on the ledger.  
Action: Handle cash refund externally in PayPal. Use Balance Adjustment only to reflect an approved app-balance change.  
Audit: Every GD credit/debit must create an `admin_adjustment` transaction with reason and adjusted-by metadata.  
Risk: High.

### Admin needs to resend a notification

Visibility: Admin Drops can send a new Drop notification; Admin Debug shows dispatch outcomes.  
Action: Send a new notification only when there is fresh operator intent. Do not replay historical notification rows manually.  
Audit: Notification persistence includes `dispatchFingerprint`, `idempotencyKey`, `dedupeKey`, `browserTag`, and dispatch lock.  
Risk: Medium.

### Admin needs to manually grant entitlement

Visibility: Admin Users exposes unlocked Drops management and validates Drop ids server-side.  
Action: Grant the canonical Drop id, then verify the user record and viewer/library access.  
Audit: Current grant writes a zero-amount admin grant transaction; add reason/admin identity metadata before making this a routine support workflow.  
Risk: High.

### Admin needs to freeze wallet or user

Visibility: Admin Users can suspend, ban, or reactivate an account. No wallet-only freeze flag was identified.  
Action: Use account-level suspend/ban for launch. Wallet-only freeze is manual DB intervention and high risk.  
Audit: Status changes are admin guarded; a separate immutable audit row was not identified.  
Risk: High.

### Admin needs to inspect transaction history

Visibility: Transaction History modal and Admin user detail Action Ledger provide read-only transaction inspection.  
Action: Use the modal for recent rows or user detail for broader support context.  
Audit: Read-only inspection is admin guarded. Follow-up mutations must use their own audit paths.  
Risk: Low.

## Manual DB Intervention Rule

Manual DB intervention is required when there is no protected product action for:

- PayPal cash refund execution.
- Wallet-only freeze.
- General onboarding reset.
- Per-recipient historical notification resend.
- arbitrary creator chat transcript inspection outside participant-scoped support/legal process.
- Broken protected media repair when CMS cannot safely write the replacement.

Any manual DB intervention must include operator name, timestamp, userId, affected resource id, exact before/after values, reason, and support thread link.

## Deferred Hardening

- Add required reason/admin UID/email to manual entitlement grant transactions.
- Add immutable audit rows for suspend, ban, activate, role, username, and entitlement grant/revoke actions.
- Add read-only support cards for PayPal order lookup, entitlement comparison, notification recipient trace, creator profile readiness, and asset health.
- Add an explicit wallet-freeze feature only if product/legal policy requires wallet-only restrictions.
