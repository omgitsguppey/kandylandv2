# Phase One Lock
Recorded: 2026-05-07
Machine-readable report: `agent/state/phase-one-lock.generated.json`

## Status
Pass.

Phase 1 has one truth gate, and the current tree keeps the recent cutovers sealed across runtime facts, materializers, admin snapshots, admin UI primitives, debug/control tower truth, realtime admin routing, generated-report authority, validator authority, release-note churn control, privacy-aware scoring, chat paid-GD guidance, upload state, storage rules, wallet source-of-funds truth, purchase/unlock server truth, and legacy-path exclusion.

## Critical Blockers
- None.

## Warnings
- None.

## Changed Files Since Last Phase Lock
- `scripts/agent/validate-phase-one-lock.ts`
- `docs/agent-truth/phase-one-lock.md`
- `agent/state/phase-one-lock.generated.json`

## Required Targeted Checks
- `npm run check:phase-one-lock`
- `npm run check:runtime-facts-cutover`
- `npm run check:materializers-cutover`
- `npm run check:admin-pages-cutover`
- `npm run check:admin-ui-primitives-cutover`
- `npm run check:debug-control-tower-cutover`
- `npm run check:admin-realtime-cutover`
- `npm run check:generated-report-authority`
- `npm run check:validator-authority`
- `npm run check:release-notes-cutover`
- `npm run check:privacy-import-export-cutover`
- `npm run check:chat-paid-gumdrops-guidance`
- `npm run check:drop-asset-upload-progress`
- `npm run check:wallet-density`
- `npm run check:wallet-single-paypal-button`
- `npm run check:payment-unlock-security`

## Forbidden Broad Checks
- `npm run check`
- `npx vitest run`
- `playwright`
- `cypress`
- `lighthouse`
- `firebase deploy`

## Promo Readiness
- Ready for promotion from a source-truth perspective.
- Rerun the targeted checks if any covered surface changes again before promoting a later commit.
- Do not let generated reports re-enter runtime import paths.
