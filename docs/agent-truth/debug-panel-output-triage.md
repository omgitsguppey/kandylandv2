# Debug Panel Output Triage

Generated artifact: `agent/state/debug-panel-output-triage.generated.json`

Validator: `npm run check:debug-panel-output-triage`

## Doctrine

Admin Debug is the Phase 1 operating surface for stale, missing, unavailable, and refreshable evidence. Stale evidence shown as stale is honest output, not a bug. Missing provider smoke, runtime smoke, visual QA, or admin truth samples must remain visible until formal artifacts exist.

Generated reports are snapshots. They can support Debug output, but they do not become runtime product truth, and they become stale after 24 hours unless a narrower contract says otherwise.

## Current Scope

This triage map records:

- the operator-facing Debug item label
- the source artifact
- generatedAt/currentHead/sourceCommit metadata when present
- source freshness and canonicality
- owning validator or focused refresh command
- whether the item blocks Phase 1
- whether the UI truth state is honest
- the recommended next action

## Hard Boundaries

The triage does not fabricate screenshots, provider smoke, runtime smoke, real-device smoke, visual QA, or production admin truth samples. Targeted behavior evidence proves focused validators only. It cannot clear visual QA, provider smoke, runtime smoke, or admin truth sample caps.

Launch readiness and PR triage validators are treated as validator-only freshness checks unless a focused generator refreshes their artifacts. If they report stale evidence, the stale label remains the truth.

## Debug Truth Rules

- Canonical beta score must come from `agent/state/public-beta-score.generated.json`.
- Report aggregate score must remain secondary and must not be labeled as the public beta score.
- Provider smoke cannot pass from operator-reported PayPal testing.
- Runtime smoke cannot pass from local validators.
- Admin truth samples cannot pass from empty or unknown sample evidence.
- Archive candidates can be shown as evidence/archive, not current authority.
- Source commit or current head drift must be surfaced when both values are available.

## Current Fix Queue

Work the visible blockers before screenshot QA:

1. Keep beta score caps visible in Debug and public beta score output.
2. Add real visual/manual evidence when screenshot QA is intentionally performed.
3. Attach formal provider and runtime smoke evidence only from actual smoke artifacts.
4. Attach a fresh admin truth sample artifact before marking admin truth healthy.
5. Refresh launch readiness/PR triage only through their focused generator or keep them stale.
