# Synthetic Creators And View-As

Status: launch admin QA doctrine  
Last updated: 2026-05-02

## Doctrine

Synthetic creators are explicit admin-created creator accounts for internal characters, demos, AI personas, and QA. They are never ordinary creator signups by accident.

Admin view-as is a safe simulation mode. It does not replace Firebase auth identity, share passwords, mint a creator session, or spend the admin wallet. The real actor remains the admin, and every action carries `performedAs: admin_view_as_creator`.

## Synthetic Creator Marker

Synthetic creator creation stores:

- `isSyntheticCreator`
- `syntheticCreatorType`
- `syntheticCreatedByUid`
- `syntheticCreatedAt`
- `syntheticReason`
- `humanOperatorRequired`
- `publicDisclosureMode` only when a public profile doctrine supports it

The Admin Roster create flow shows the synthetic creator control only to the owner. A reason is required. Creation writes top-level user fields, creator onboarding projection fields, queue fields, `synthetic_creator_created` history, and `admin_synthetic_creator_created` telemetry.

## View-As Simulation

View-as state is session-scoped:

- `adminViewingAsUserId`
- `adminViewingAsRole: creator`
- `simulationStartedAt`
- `simulationReason`
- `viewAsActorUid`
- `viewAsReturnHref`

The persistent banner says “Viewing as [creator]. Return to admin” and stays visible above the mobile safe area or top bar. Return clears only the simulation state and records `admin_view_as_creator_ended`.

## Blocked Actions

While view-as is active, `authFetch` blocks payment, purchase, wallet, unlock, and creator state-changing routes. Blocked actions record `admin_view_as_creator_action_blocked` and `admin_view_as_action_blocked` audit evidence.

Safe reads may carry view-as headers so future QA surfaces can render simulated context without changing the authenticated Firebase user.

## Debug

Debug evidence includes:

- `activeViewAsUserId`
- `activeViewAsRole`
- `viewAsStartedAt`
- `viewAsActorUid`
- `viewAsReturnHref`
- `syntheticCreatorMarkerPresent`
- `destructiveActionsBlockedInViewAs`

## Validation

Run:

```bash
npm run check:synthetic-creators-view-as
npx vitest run tests/unit/synthetic-creators-view-as.spec.ts tests/unit/actor-markers.spec.ts tests/unit/admin-roster-decision-queue.spec.ts
```

Future agents must not implement creator QA through password sharing, real session takeover, or wallet/payment actions in a simulated creator context.
