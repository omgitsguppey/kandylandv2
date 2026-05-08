# User Critical Path Lock
Recorded: 2026-05-08  
Machine-readable report: `agent/state/user-critical-path-lock.generated.json`

## Status
Pass.

The user-facing Phase 1 journey is sealed across guest home, signup/login, dashboard check-in, drops browsing, locked preview, wallet refill, unlock, viewer handoff, chat, and support escape hatches. The current tree keeps user copy human-readable and avoids admin/debug leakage on the public path.
Daily tasks in the dashboard follow the same rule: the assigned set stays stable for the active daily window, the reset timer is visible, and incomplete tasks do not fail or disappear before the daily reset.

## Critical Blockers
- None.

## Warnings
- None.

## Changed Files Since Last User Critical Path Lock
- `agent/state/user-critical-path-lock.generated.json`
- `package.json`
- `scripts/agent/validate-user-critical-path-lock.ts`
- `src/app/HomeClient.tsx`
- `src/components/Chat/ChatExperience.tsx`
- `src/components/Support/SupportInbox.tsx`
- `src/lib/chat-send-feedback.ts`
- `tests/unit/chat-send-feedback.spec.ts`
- `src/components/Dashboard/DailyTasksModule.tsx`

## Required Targeted Checks
- `npm run check:user-critical-path-lock`
- `npm run typecheck`
- `npx vitest run tests/unit/chat-send-feedback.spec.ts`

## Forbidden Broad Checks
- `npm run check`
- `playwright`
- `cypress`
- `lighthouse`
- `firebase deploy`

## Promo Readiness
- Ready for public promo on the current tree.
- Rerun the targeted checks if any user-facing surface in this lock changes again.
- Keep admin/debug language out of the public journey.
