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

Allowed `performedAs` values are `own_account`, `admin_on_behalf`, `owner_override`, and `system_job`.

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
- Creator waitlist actions such as intro acknowledgement, ID submission, contract signature, and application edit are `own_account`.
- Admin Roster creation/backfill is `admin_on_behalf` unless it is an owner-only bypass.
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
