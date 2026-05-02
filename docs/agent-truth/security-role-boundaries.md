# Security Role Boundaries

Status: launch security guard
Recorded: 2026-05-01

Machine-readable audit: `agent/state/security-role-boundary-audit.generated.json`
Validator: `npm run check:security-role-boundaries`

## Actor Lanes

- `guest`: public browsing only. No raw Firestore Drop docs, private creator data, wallet state, chat state, notifications, or admin data.
- `authenticated user`: can read and mutate only their own user-scoped data through guarded routes or owner-scoped rules.
- `creator`: authenticated user with creator role. Creator-only routes must re-read the user profile server-side and force ownership to caller uid.
- `admin`: admin role verified by server-side Firestore profile check. Admin APIs must never trust client UI visibility alone.
- `system/server job`: Firebase scheduled functions, Admin SDK routes, or cron-secret adapters.
- `unknown`: never promoted to authenticated. Unknown actor telemetry must stay guest/anonymous.

## Admin Boundaries

Admin pages are gated by `src/app/admin/layout.tsx`, and admin data is gated by `/api/admin/**` plus Firestore admin-only rules. Every admin API route must have an explicit admin guard. Every admin `POST`, `PUT`, `PATCH`, and `DELETE` route must set `requireTrustedOrigin: true`.

Admin analytics and debug data are private. Redirect shims count as admin API routes and must run the same admin guard before routing to a protected lane.

## Drop Asset Boundary

Raw `storage:drops/**` client SDK access is denied. Storage object paths do not encode drop entitlement, so Storage rules cannot prove whether a user unlocked a Drop.

Drop asset writes now go through server routes:

- Admin uploads: `/api/admin/content`
- Creator submissions: `/api/creator/drops/assets`

Protected content reads go through `/api/drops/content`, which verifies creator ownership or `unlockedContent` entitlement and returns a private no-store proxy stream.

## Money And Entitlement

Wallet and Gum Drops mutations are server-truth only.

- PayPal create validates the package and binds the server-created order.
- PayPal capture verifies PayPal completion, USD package price, `custom_id` user/package binding, and `paymentLocks`.
- Unlock uses a Firestore transaction, reads server-side source-aware balance, spends Gum Drops server-side, and records entitlement idempotently.
- Content access requires entitlement or creator ownership.

The client may request a mutation, but it never supplies authoritative balance, paid/bonus split, revenue, unlock status, or entitlement.

## Chat And Notifications

Chat APIs require authenticated trusted-origin callers and participant-aware server helpers. Attachment routes additionally require the storage path to match `creator/messages/{callerUid}/{threadId}/`.

Notification APIs separate actors:

- User `GET`/`PUT`: recipient-visible notifications only.
- Admin `POST`: create/broadcast through admin auth and trusted origin.
- Firestore notification rules: recipient read only, no direct client writes.

## Firebase Rules

Firestore:

- Drops are admin-read-only in client rules.
- Users, transactions, and notifications are owner-scoped where readable.
- Creator chat threads/messages are participant/admin readable and never directly writable.
- Admin analytics/debug collections are admin-read-only and server-write-only.

Realtime Database:

- `chat_presence` is participant-readable.
- Each participant can write only their own uid child.

Storage:

- Avatars remain owner-scoped.
- Creator message attachments remain uploader-scoped.
- `drops/**` is server-only.

## Future Agent Rules

- Do not add an admin route without `auth: "admin"`.
- Do not add state-changing admin routes without `requireTrustedOrigin: true`.
- Do not make Storage rules prove Drop entitlement from `drops/**` paths.
- Do not let client code write wallet balances, unlock entitlements, revenue fields, or Drop asset paths directly.
- Do not import `@/lib/server/**`, `server-only`, or Firebase Admin SDK from a `"use client"` module.
- Do not expose creator private fields through public creator profile routes.
- Do not add public cron/system triggers without a server-only scheduler or shared-secret guard.
