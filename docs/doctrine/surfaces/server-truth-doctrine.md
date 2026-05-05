# Server Truth Doctrine

Authority: primary surface doctrine for API routes, server helpers, Firebase rules, functions, Data Connect mirror, and backend contracts.

## Priority

Server truth prioritizes canonical data, security, cost control, auditability, idempotency, typed failures, and actor/target separation.

## Rules

- Server owns money, purchases, unlocks, entitlements, creator monetization, support permission, moderation evidence, account mutation, and security facts.
- Client UI can submit intent or display projection; it cannot define canonical truth.
- Route handlers should call contracts/helpers instead of inlining scoring formulas, ledger math, entitlement rules, or telemetry projection.
- Every server route must declare or enforce auth, trusted origin, rate limit, cache mode, source truth, cost risk, and expected failure behavior.
- Server telemetry must use actorUserId, actorCreatorId, actorAdminId, targetCreatorId, and targetUserId correctly.
- Server code must not import UI doctrine or user-interface presentation rules.
- Data Connect and SQL remain agent-context mirrors unless an explicit server contract promotes them.

## Must Not

- Do not calculate revenue, unlock counts, paid-source eligibility, support permissions, or moderation evidence in UI.
- Do not let client-only events inflate revenue, unlock, engagement, creator activity, or user value metrics.
- Do not inline route scoring formulas that belong in contracts or server helpers.
- Do not place user-facing UI copy or layout rules in server truth code.

## Applies To

- `/api/**`, `src/lib/server/**`, `functions/src/**`, `firestore.rules`, `storage.rules`, `dataconnect/**`, payment/unlock/support/moderation/auth routes, and server-only contracts.

## Validators

- `check:surface-doctrine-split`
- `check:speed-security`
- `check:payment-unlock-security`
- `check:purchase-telemetry-truth`
- `check:unlock-telemetry-truth`
- `check:actor-target-telemetry`
