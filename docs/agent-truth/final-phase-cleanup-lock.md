# Final Phase Cleanup Lock

Authority: Current cleanup-phase lock for source evidence and readiness caveats.

Report: `agent/state/final-phase-cleanup-lock.generated.json`  
Validator: `npm run check:final-phase-cleanup-lock`

## Scope

This lock closes the current source-connected cleanup phase. It refreshes the repo-owned evidence maps, classifies stale/archive reports, and separates code blockers from missing manual, provider, runtime, and admin-sample evidence.

This is not a visual QA pass, deployment pass, provider smoke pass, or beta readiness claim. Screenshots are now confirmation evidence for the locked source state, not discovery for more mystery patches.

## Current Lock State

Latest generated lock status:

- User-facing connection: P0=0, P1=0, P2=1.
- Product surface integrity: P0=0, P1=0, P2=26.
- Speed/security: 51/beta-risk, 91 findings, 0 critical findings.
- Public beta score: 45/100, `Stale evidence`.
- Remaining blocker counts: P0=0, P1=4, P2=9.
- `canStartScreenshotQa`: true.
- `canStartProviderSmoke`: true.
- `canStartBetaExitReview`: false.

The source cleanup lock allows screenshot QA and formal smoke work to begin. It does not say Phase 1 is complete, beta-ready, or launch-ready.

## Remaining Blockers

P1 evidence blockers:

- `visual_qa_required`: run screenshot QA on the locked source surfaces and attach real visual evidence.
- `provider_smoke_required`: run formal provider smoke and refresh `agent/state/provider-smoke-evidence.generated.json`.
- `runtime_smoke_required`: run deployed/runtime smoke and refresh `agent/state/runtime-smoke-evidence.generated.json`.
- `admin_truth_sample_required`: attach a fresh admin truth screenshot or JSON sample with source freshness and sample count.

P2 cleanup and authority blockers:

- Continue focused speed/security guardrail cleanup from the current `recommendedFixOrder`.
- Refresh or archive stale generated reports through their owning validators.
- Treat launch PR triage and launch readiness reports as stale/evidence-only until regenerated.
- Keep speed/security and public beta generated reports as evidence snapshots when they lack source commit metadata.

## Operating Rules

- Generated reports are operating maps, not runtime truth.
- A stale generated report must be labeled stale/evidence-only or refreshed through a focused command.
- Provider smoke, runtime smoke, visual QA, real-device/manual evidence, and admin truth samples cannot be inferred from source validators.
- Do not reopen fake actions, additive patch stacking, or UI-only/backend-only fixes.
- Do not mark beta exit review ready while P1 evidence blockers or unclassified stale authority risks remain.

## Exact Next Steps

1. Run screenshot QA against the locked source surfaces and attach the visual evidence artifact.
2. Run formal provider smoke and refresh provider smoke evidence.
3. Run runtime smoke and refresh runtime smoke evidence.
4. Attach fresh admin truth sample evidence.
5. Continue focused speed/security cleanup only from current owner-ranked findings.
6. Refresh or archive launch/readiness generated reports before using them as current authority.
