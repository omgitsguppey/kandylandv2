# Creator Intake Flow

Status: Launch UI and source-truth doctrine  
Last updated: 2026-05-02

## Doctrine

Creator intake is a five-step guided flow. It should feel simple and specific to KandyDrops before it exposes agreement, identity, or review machinery.

The creator-facing flow is:

1. `You already have attention. Let’s decide what it should become.`
2. `Where do your fans already find you?`
3. `Recommended creator setup`
4. `Review the creator agreement`
5. `Submit for review`

Main intake UI must not show raw legal, compliance, ID, or backend enum states before the agreement step. Those details stay on the creator status page, Admin Roster, and Debug surfaces.

## Canonical Fields

Creator signup still writes through `/api/user/register` and `ensureCreatorOnboardingSubmission`. Do not create a parallel intake collection for these fields.

The canonical onboarding/projection state includes:

- `creatorMonetizationGoals`
- `creatorFollowerRange`
- `creatorPostingFrequency`
- `fansAlreadyAskForAccess`
- `creatorRecommendedSetup`
- `intakeVersion`
- `intakeSubmittedAt`
- `intakeSource: creator_site`

Age or review state should not erase these fields. Existing canonical onboarding and queue projections must preserve them.

## Telemetry

The creator intake emits:

- `creator_intake_started`
- `creator_intake_step_completed`
- `creator_intake_goal_selected`
- `creator_intake_recommended_setup_shown`
- `creator_intake_submitted`

Payloads must include `actorType`, `actorUid` when available, `anonymousVisitorId` or `sessionId`, `signupIntent: creator`, `stepKey`, `source: creator_intake`, and `route`.

Server-side submission telemetry uses the same actor marker pattern and records the created user as `actorType: user` with `performedAs: own_account`.

## History

New onboarding records append:

- `intake_started`
- `intake_step_completed`
- `intake_submitted`

These live in `creator_onboarding/{uid}/history/{eventId}` and keep actor marker debug fields when available.

## Mobile Rules

- One question group per screen/card.
- Progress text stays short: `Step 1 of 5`.
- Bottom CTA reserves `env(safe-area-inset-bottom)`.
- Use black, zinc, white, and brand purple only.
- Buttons that select goals or setups must be real buttons with `aria-pressed`.
- No fake chips, raw enum labels, or long legal paragraphs in the creator-facing intake.

## Validation

Run:

```bash
npm run check:creator-intake-flow
npx vitest run tests/unit/creator-intake-flow.spec.ts tests/unit/creator-intake-flow-component.spec.tsx tests/unit/creator-onboarding-server.spec.ts tests/unit/user-register-route.spec.ts
```

Future agents must keep the guided intake, canonical onboarding write path, telemetry, and history events aligned.
