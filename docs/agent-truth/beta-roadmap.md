# Beta Roadmap

Status: canonical Phase 1 stabilization doctrine  
Recorded: 2026-05-05

## Phase 1: Debug-First Stabilization

Phase 1 finalizes currently implemented experiences and fixes issues one by one from Debug Control Tower or admin evidence.

Rules:

- Work from one selected Debug Control Tower/admin-evidence issue at a time.
- Every fix must include the selected issue id or fingerprint.
- Every fix must name the affected surface, expected user impact, allowed files, forbidden files, validator, release-note impact, and rollback note.
- No broad fixes.
- No unrelated refactors.
- No cleanup sweep unless a specific debug issue demands it.
- Preserve runtime truth for payments, unlocks, creator monetization, support, admin projection, telemetry, and release notes.

Allowed Phase 1 work:

- Targeted bug fixes tied to Debug Control Tower evidence.
- Targeted release-note truth fixes.
- Targeted admin/debug evidence improvements that make existing issues more actionable.
- Targeted docs updates that keep the stabilization process enforceable.

Not Phase 1:

- KreditFlow implementation.
- Advocacy/referral economy implementation.
- Payment, unlock, creator, or referral economics redesign.
- Broad UI, telemetry, cost, or architecture rewrites.

## Phase 2: KreditFlow by iKandy

KreditFlow by iKandy is Phase 2. It must be introduced gracefully as an optional creator-dashboard service with its own source-of-truth, ledger, incentive system, permission model, telemetry boundaries, admin diagnostics, and rollback plan.

Phase 2 must not be mixed into Phase 1 stabilization. If KreditFlow planning discovers a Phase 1 blocker, log the blocker as a Debug Control Tower issue and fix it through the one-issue process before implementation.

## Phase 3: Advocacy And Referral Economy

Advocacy and referral mechanics are Phase 3, after KreditFlow and current experience loops are stable.

Phase 3 requires:

- Canonical revenue waterfall.
- Payout safeguards.
- Referral fraud and abuse controls.
- Ledger ownership.
- Admin dispute visibility.
- Release-note and support truth.

## Beta Exit

KandyDrops exits beta only after:

- Current user experiences are stable.
- Creator dashboard beta is usable.
- KreditFlow is integrated cleanly.
- Advocacy/referral mechanics have canonical revenue waterfall and payout safeguards.
- Release notes and changelog truth stay current.

## Prompt Contract

Every Phase 1 fix prompt must include:

- `selectedIssueIdOrFingerprint`
- `affectedSurface`
- `expectedUserImpact`
- `filesAllowed`
- `filesForbidden`
- `validatorToRun`
- `releaseNoteImpact`
- `rollbackNote`
