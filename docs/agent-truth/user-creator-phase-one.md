# User Creator Phase 1 Lock

Status: ready when the gate passes.

Machine-readable report: `agent/state/user-creator-phase-one.generated.json`

## What This Gate Proves

This is the final Phase 1 readiness gate for the user and creator public surfaces. It composes only targeted validators and tells us whether the public promo path is still sealed without running broad audits.

The gate covers:

- user critical path
- creator public profile
- creator dashboard projection
- creator monetization guidance
- mobile shell and layout contract
- wallet paid/free source truth
- unlock entitlement truth
- chat paid-GD guidance
- release notes and beta badge
- upload progress validation only when upload surfaces change

## Required Validator Set

These validators run for every pass of this gate:

- `npm run check:user-critical-path-lock`
- `npm run check:creator-public-profile-lock`
- `npm run check:creator-dashboard-projection-lock`
- `npm run check:creator-monetization-gates-lock`
- `npm run check:mobile-shell-safe-area`
- `npm run check:gumdrop-source-of-funds-truth`
- `npm run check:payment-unlock-security`
- `npm run check:chat-paid-gumdrops-guidance`
- `npm run check:release-notes-cutover`
- `npm run check:beta-versioning`
- `npm run check:beta-release-notes`
- `npm run check:beta-modal-layout`

## Conditional Validator

- `npm run check:drop-asset-upload-progress`

Run this only when upload surfaces change in the current tree. The final gate records it as skipped when no upload surface is touched.

## Failure Rules

- Any failure is a Phase 1 blocker until the exact surface is fixed.
- User-facing and creator-facing surfaces must not leak admin/debug language.
- Blocked states must keep a clear CTA or next action.
- Generic internal-service errors in expected user or creator flows are not acceptable.

## Promo Readiness

- `ready` means user and creator Phase 1 are locked for public promo on the current tree.
- `blocked` means one or more targeted validators failed and the specific surface needs repair before promo.
