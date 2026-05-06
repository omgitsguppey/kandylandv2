# Admin Creator Account Controls

Status: Launch hardening doctrine  
Last updated: 2026-05-02

## Doctrine

Admin Roster account controls are for quick, audited creator account fixes. They are not a second source of truth for onboarding, roles, wallet state, or creator tooling. Every account-control mutation must go through the guarded server route, carry an identity marker, and write creator onboarding history or Debug evidence.

The selected creator record shows `Account controls` collapsed by default. Normal admins can update profile details, creator-safe status fields, and notification settings. Dangerous controls require confirmation. Owner-only permission stays required before any admin role grant.

Creator fan experience settings live in their own collapsed `Fan experience settings` section and route. Account controls may link the operator to creator/fan settings, but Fan Pass, private chat, custom requests, live time, pricing, availability, and creator restrictions must use the `CreatorSettings` and `CreatorRestrictions` model documented in `docs/agent-truth/creator-fan-experience-settings.md`.

## Server Boundary

Canonical route:

- `POST /api/admin/creator-account-controls`
- File: `src/app/api/admin/creator-account-controls/route.ts`
- Guard: `auth: "admin"` and `requireTrustedOrigin: true`
- Surface marker: `creator_account_admin`
- Performed as: `admin_on_behalf`

The client never writes these account fields directly. Firebase Auth updates use the Admin SDK server-side. Password actions never read, display, or store the current password.

## Supported Actions

- `update_profile`: display name and username/handle. Username reservations must use the canonical username helper.
- `update_email`: Admin SDK email update plus redacted old/new email audit evidence.
- `create_password_reset_link`: creates a server-generated reset link for the admin workflow. The link is not stored.
- `set_temporary_password`: server-only Admin SDK password update. The temporary value is not persisted and telemetry uses `[password hidden]`.
- `update_role`: owner-only for `admin`; creator activation still obeys onboarding prerequisites.
- `update_status`: active, suspended, or banned. Firebase disabled state follows non-active statuses.
- `update_notification_settings`: quick settings edit only; notification send/read truth remains in notification records.

## Audit And Telemetry

Every action emits one of:

- `admin_creator_account_updated`
- `admin_creator_email_updated`
- `admin_creator_password_reset_sent`
- `admin_creator_temporary_password_set`
- `admin_creator_role_updated`
- `admin_creator_status_updated`

Required payload fields include `actorType`, `actorUid`, `targetUserId`, `performedAs: admin_on_behalf`, `fieldChanged`, `oldValueRedacted`, `newValueRedacted`, and `route: /admin/roster`.

Creator onboarding history records `admin_account_updated`. Role activation still writes `creator_role_activated` or `creator_role_activation_blocked`; owner-only actions keep `owner_override_applied` where applicable.

Admin and owner override reasons are optional. Missing `ownerOverrideReason` may be shown as an optional audit note but is not an error, parity failure, or launch blocker unless a specific high-risk action explicitly requires a reason. Required audit evidence still includes actor id, action type, override active flag, target user/creator id, timestamp, source surface, and owner/admin actor marker.

Synthetic/internal creator classification is an admin-only control path. The action label is "Mark as internal synthetic creator" and it requires a synthetic creator type, internal reason, target creator id, actor marker, timestamp, and `syntheticLegalEvidenceMode: internal_synthetic_no_external_agreement`. It must not change approval, role, payout, ledger, or public profile copy.

## Debug Fields

Debug evidence may show raw ids. Main UI must not.

- `lastAdminAccountActionAt`
- `lastAdminAccountActionBy`
- `accountControlWarnings`
- `passwordActionMode`
- `emailUpdateServerConfirmed`
- `roleUpdateServerConfirmed`

## UI Rules

- Keep `Account controls` collapsed by default.
- Keep labels plain: Display name, Username / handle, Email, Temporary password, Role, Account status, Creator approval.
- Do not show current password.
- Do not expose raw enum labels as visible copy.
- Dangerous controls require confirmation and must be mobile tap-target safe.
- Non-owner admins must see that owner admin is required to grant admin access.

## Validation

Run:

```bash
npm run check:admin-creator-account-controls
npx vitest run tests/unit/admin-creator-account-controls-route.spec.ts tests/unit/admin-users-route.spec.ts tests/unit/admin-roster-decision-queue.spec.ts
```

Future account controls must extend this route/helper instead of adding unguarded UI-only mutations.
