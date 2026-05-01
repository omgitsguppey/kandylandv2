# User Critical Path Launch

Status: Active launch-critical path guard  
Recorded: 2026-05-01  
Scope: targeted blocker/high-priority fixes only

## Source Audit

The requested `agent/state/user-critical-path-audit.generated.json` artifact was missing from git history and `origin/main` at the start of this pass. The pass did not invent product blockers. It ran existing targeted user-path checks and recorded the reproducible high-priority launch blocker as `UCP-001` in the generated audit file.

## Fixed Issues

### UCP-001: Drops Mobile Timer Validation Drift

Before:
- `npm run check:drops-mobile-refinement` failed because the validator still required `DropCardParts.tsx` to contain `formatTimer`.
- The runtime component had already moved to `formatDropCountdown` from `src/lib/drop-countdown.ts`.
- The `Always available` fallback lived in the shared helper, not the component.

After:
- `scripts/agent/validate-drops-mobile-refinement.ts` now verifies `formatDropCountdown` in `DropCardParts.tsx`.
- The same validator checks that `src/lib/drop-countdown.ts` owns the `Always available` fallback.
- `tests/unit/drop-countdown.spec.ts` now protects the helper fallback and inherited-font timer contract.

Files changed:
- `scripts/agent/validate-drops-mobile-refinement.ts`
- `tests/unit/drop-countdown.spec.ts`
- `agent/state/user-critical-path-audit.generated.json`
- `agent/state/user-critical-path-fix-report.generated.json`
- `scripts/agent/validate-user-critical-path-launch.ts`
- `package.json`
- `FULL_SCALE_CODEBASE_AUDIT.md`

Debug metadata:
- Not applicable. No runtime data, telemetry payload, admin analytics behavior, or user-facing copy changed.

## Launch Guardrails

- Do not change payment/write flows without targeted payment tests and docs.
- Do not change unlock or entitlement behavior without targeted unlock/content-access tests.
- Do not change chat/message route layout without `npm run check:user-chat-shell-routing`.
- Do not change notifications without `npm run check:notification-pipeline`.
- Do not change 404/recovery behavior without `npm run check:not-found`.
- Do not change Drops card/timer/mobile behavior without `npm run check:drops-mobile-refinement` and focused Drop tests.

## Required Validation

- `npm run check:user-critical-path-launch`
- `npm run check:drops-mobile-refinement`
- `npm run check:user-chat-shell-routing`
- `npm run check:not-found`
- `npm run check:notification-pipeline`
- `npx vitest run tests/unit/drop-countdown.spec.ts tests/unit/paypal-capture-route.spec.ts tests/unit/drops-route.spec.ts tests/unit/chat-thread-route.spec.ts tests/unit/chat-thread-messages-route.spec.ts tests/unit/notifications-route.spec.ts`
- `npm run typecheck -- --pretty false`

## Current Non-Failing Surfaces

At audit time, targeted checks for chat shell/routing, 404 recovery, notifications, and focused payment/drop/chat/notification route tests passed. They were not edited in this pass.
