# Creator Identity Markers

Status: Launch hardening doctrine  
Last updated: 2026-05-02

## Doctrine

Creator intake, Admin Roster, creator experience settings, and creator account/admin actions must carry an explicit actor marker. The marker tells Debug and analytics who acted, who was affected, and whether the action was self-service, admin-on-behalf, owner override, or a system job.

Unknown actors must never be promoted to user, creator, admin, or owner. If a trusted actor cannot be proven, telemetry must block emission through `assertKnownActor(...)` or record a safe unknown state with `unknownActorBlocked: true`.

## Canonical Helper

The helper lives at `src/lib/identity/actor-markers.ts` and exposes:

- `classifyActorFromUser(user)`
- `buildActorMarker(input)`
- `buildAdminOnBehalfMarker(admin, targetUser)`
- `assertKnownActor(marker)`
- `explainActorMarker(marker)`
- `actorMarkerToTelemetryPayload(marker)`
- `buildActorMarkerDebugFields(marker)`

## Actor Lanes

Allowed lanes are:

- `guest`
- `user`
- `creator`
- `admin`
- `owner_admin`
- `system`
- `unknown`

`owner_admin` is an admin lane with stricter meaning: it is the primary owner or owner-level operator applying an owner-only action. It must not be counted as user behavior.

## Required Marker Fields

Every marker includes:

- `actorType`
- `actorUid`
- `actorEmail` when available
- `actorRole`
- `targetUserId` when acting on someone else
- `targetCreatorId` when applicable
- `performedAs`
- `surface`
- `route`
- `actionKey`
- `occurredAt`
- `dedupeKey`
- `source`

Allowed `performedAs` values are `own_account`, `admin_on_behalf`, `owner_override`, `admin_view_as_creator`, and `system_job`.

Allowed creator identity surfaces are `admin_roster`, `creator_intake`, `creator_experiences`, and `creator_account_admin`.

## Debug Fields

Creator onboarding history and diagnostics should include:

- `actorMarkerPresent`
- `actorType`
- `performedAs`
- `targetUserId`
- `targetCreatorId`
- `actorClassificationReason`
- `unknownActorBlocked`

These raw ids are Debug evidence. Do not expose them as visible creator-facing UI copy.

## Integration Rules

- Creator signup through `/api/user/register` is `actorType: user`, `performedAs: own_account`, and targets the same uid.
- Creator-facing intake UI events start as guest/session events until the account exists. They must include `actorType`, `actorUid` when available, `anonymousVisitorId` or `sessionId`, `stepKey`, `signupIntent: creator`, `source: creator_intake`, and `route`.
- The guided intake emits `creator_intake_started`, `creator_intake_step_completed`, `creator_intake_goal_selected`, `creator_intake_recommended_setup_shown`, and `creator_intake_submitted`.
- Creator waitlist actions such as intro acknowledgement, ID submission, contract signature, and application edit are `own_account`.
- Admin Roster creation/backfill is `admin_on_behalf` unless it is an owner-only bypass.
- Synthetic creator creation is owner-only and emits `admin_synthetic_creator_created` with `isSyntheticCreator`, `syntheticCreatorType`, `syntheticReason`, and the affected creator as `targetUserId`.
- Synthetic/internal creators must also store `syntheticLegalEvidenceMode: internal_synthetic_no_external_agreement`, `syntheticCreatedByUid`, `syntheticCreatedAt`, and `humanOperatorRequired`. This marker is internal-only evidence and is not public profile copy.
- Existing creator records can be classified through the admin-only action `Mark as internal synthetic creator` when an operator has strong internal evidence. The action records `synthetic_creator_marked` history with actor marker, target creator, reason, synthetic creator type, and internal legal evidence mode.
- Admin creator QA simulation uses `performedAs: admin_view_as_creator`. It must preserve the admin's real Firebase auth identity, include `targetUserId`, show a return-to-admin banner, and block wallet/payment/unlock actions.
- Admin Roster agreement lifecycle actions use the same markers. Template creation is an admin action, template activation is `owner_override`, agreement send/update/countersign is `admin_on_behalf` with the creator as `targetUserId`.
- Admin Roster account controls use surface `creator_account_admin` and `performedAs: admin_on_behalf`. Profile, email, password reset, temporary password, role, status, creator approval, and notification setting changes must include `actorType`, `actorUid`, `targetUserId`, `fieldChanged`, redacted old/new values, and `/admin/roster` as the route. These events must not enter user behavior analytics as if the creator performed them.
- Owner-only onboarding bypass and live creator creation are `actorType: owner_admin` with `performedAs: owner_override`.
- Creator settings updates use `creator_experiences`; admin restriction updates from that route must still declare `performedAs`.
- System projections may use `system_job`, but they should preserve the affected target id.
- Admin Roster decision queue UI events must emit identity-marked payloads for tab changes, record opens, primary actions, and collapsed section expansion. These UI telemetry events still use `actorType: admin` or `owner_admin` and must include `targetUserId` when a creator record is selected.

## Validation

Run:

```bash
npm run check:creator-identity-markers
npx vitest run tests/unit/actor-markers.spec.ts tests/unit/analytics-event-contract.spec.ts
```

Future creator/admin events must not ship without actor markers, Debug evidence, and the existing analytics actor taxonomy.
