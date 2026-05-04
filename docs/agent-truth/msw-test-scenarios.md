# MSW Test Scenarios

KandyDrops MSW scenarios are deterministic API fixtures, not production fallback state. They test wallet, Drops, chat, notifications, support, and creator profile behavior without real Firebase, browser automation, or live network access.

## Files

- `tests/mocks/scenarios.ts` owns deterministic fixture state and scenario names.
- `tests/mocks/handlers.ts` maps user-side API routes to the active scenario.
- `tests/mocks/server.ts` exports the shared Node MSW server plus scenario helpers.
- `tests/unit/msw-user-flow-scenarios.spec.ts` verifies that the scenarios and handlers work together.

## Scenario Names

- `guestBrowsingDrops`
- `loggedInEnoughGumDrops`
- `loggedInInsufficientGumDrops`
- `paidRewardBalanceSplit`
- `creatorProfileWithDropsAndExperiences`
- `notificationInboxReadStates`
- `chatThreadWithPaidBalance`
- `supportTicketBugReportStates`

Each scenario uses deterministic fixture names, ids, balances, timestamps, Drops, notifications, chat threads, support tickets, and creator profile data. Tests should select scenarios through `setKandyDropsMockScenario(...)` and reset state with `resetKandyDropsMockScenario()` after each spec.

## Usage

Use the shared server in targeted Vitest tests:

```ts
import { server, setKandyDropsMockScenario, resetKandyDropsMockScenario } from "../mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetKandyDropsMockScenario();
});
afterAll(() => server.close());
```

Use `onUnhandledRequest: "error"` so tests fail when a route tries to escape to the live network.

## Boundaries

- Do not use MSW fixtures as production fallback data.
- Do not model Firebase rules behavior here; use Firebase rules tests for that lane.
- Do not test PayPal, ledger, or unlock enforcement by trusting mocks alone.
- Do not add Playwright, Lighthouse, Cypress, broad UI audits, or Firebase emulator requirements to this MSW lane.
- Keep scenario ids and fixture names deterministic so failures are easy to read.
