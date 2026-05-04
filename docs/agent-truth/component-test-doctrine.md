# Component Test Doctrine

KandyDrops component tests verify behavior and state truth, not screenshots. Fast UI tests should use shared auth/profile/drop states, exercise real component affordances where practical, and preserve telemetry/source-of-truth contracts without changing product behavior.

## Purpose

Use Testing Library and Vitest component tests for public beta behavior that does not require a real browser:

- CTA truth for guest, logged-in, admin, enough GumDrops, insufficient GumDrops, and owned/unwrapped states.
- Presentation variants such as Dashboard versus Experiences.
- Notification read, viewed, and optimistic reconciliation state.
- Accessibility-relevant labels and roles when they are part of behavior.

## Shared Helpers

Common states live in `tests/unit/utils/kandydrops-test-states.ts`:

- `guestAuthState`
- `loggedInUserState`
- `adminState`
- `enoughGumDropsState`
- `insufficientGumDropsState`
- `ownedDropState`
- `buildTestDrop`
- `buildTestProfile`
- `buildTestUser`

Tests should prefer these helpers over hand-built one-off auth/profile fixtures so UI state truth stays consistent across surfaces.

## Setup

- `tests/setup/jest-dom.ts` installs jest-dom matchers.
- `vitest.contracts.config.ts` and the unit-test project in `vitest.config.ts` load deterministic mocks and jest-dom setup.
- Targeted component tests should run with `vitest run --config vitest.contracts.config.ts <files>`.

## Current Behavior Tests

- `tests/unit/drop-card-state.spec.tsx`: guest signup CTA, authenticated affordability, refill state, and owned/unwrapped state.
- `tests/unit/daily-checkin-variant.spec.tsx`: Dashboard keeps the DailyCheckIn header/subtitle; Experiences hides only that header/subtitle.
- `tests/unit/notification-read-state.spec.tsx`: notification mark-read removes visible unread items; view-preserving reads keep the item while marking it viewed.

## Boundaries

Do not use these tests to replace server route, ledger, payment, unlock, Firebase rules, or full runtime validation. Do not add screenshots, Playwright, Lighthouse, Cypress, or broad UI audits to this lane.
