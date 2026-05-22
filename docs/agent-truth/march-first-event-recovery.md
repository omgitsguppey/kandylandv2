# March First Event Recovery

Generated: 2026-05-22T22:28:14.380Z
Status: pass
Current head: a068b0c2b19ff7cc94a770a7461c3394a52fa9f1

## Contract

- Recovery starts at `2026-03-01`.
- Recovery is dry-run only: no production reads, live backfill, or mutations.
- Legacy records produce normalized event envelope candidates with confidence, consent assumption, duplicate risk, and action labels.
- Unknown or weak legacy evidence stays weak or unknown and cannot become exact current user truth.
- Missing consent falls back to minimal page/session evidence when safe, or necessary-only archive evidence; it never becomes full behavioral tracking.
- Wallet/payment lifecycle records are manual-review candidates only. Payment, wallet crediting, pricing, and GumDrop math are untouched.
- Admin Debug exposes one `Legacy recovery` lane with counts by confidence/action and raw dumps collapsed.

## Supported Domains

- page_session
- wallet_payment_lifecycle
- drop_open_unwrap
- creator_profile_view
- fan_pass_subscription
- broadcasts
- notifications
- behavior_signals
- identity_links
- legacy_unknown

## Dry-Run Summary

- Input records: 3
- Candidate count: 3
- Recovery start date: 2026-03-01
- Mutations allowed: false
- Raw records included: false

## Checks

- pass: recoveryDateIsMarchFirst
- pass: dryRunOnlyNoLiveMutation
- pass: noMutationExports
- pass: domainsCovered
- pass: unknownLegacyNotExactUser
- pass: missingConsentNotFullBehavioral
- pass: duplicateRiskPresent
- pass: everyLegacyEventHasEnvelopeCandidate
- pass: paymentLifecycleManualReviewOnly
- pass: debugPanelHasSingleLegacyRecoveryLane
- pass: testCoversBoundaryConsentAndUnknown
- pass: packageScriptPresent
- pass: chatNavPaymentGumdropRuntimeUntouched

## Changed Files

- CHANGELOG.md
- agent/state/march-first-event-recovery.generated.json
- agent/state/public-beta-score.generated.json
- docs/agent-truth/march-first-event-recovery.md
- package.json
- public/kandydrops-release-notes.json
- scripts/agent/validate-march-first-event-recovery.ts
- src/app/api/admin/debug/route.ts
- src/lib/legacy/legacy-event-recovery-contract.ts
- src/lib/legacy/march-first-event-recovery.ts
- src/lib/release-notes/public-release-notes.ts
- src/lib/release-notes/release-version-contract.ts
- src/lib/server/admin-debug/legacy-recovery-summary.ts
- tests/unit/march-first-event-recovery.spec.ts

## Validation Failures

- none
