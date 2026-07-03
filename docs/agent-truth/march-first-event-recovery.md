# March First Event Recovery

Generated: 2026-07-03T01:14:43.124Z
Status: pass
Current head: 2898567cf6de9b154e9b33a8a2fda8bd34ce35f8

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

- agent/state/analytics-legacy-recovery-reconciliation.generated.json
- agent/state/march-first-event-recovery.generated.json
- docs/agent-truth/analytics-legacy-recovery-reconciliation.md
- docs/agent-truth/march-first-event-recovery.md
- src/lib/analytics/legacy-recovery-reconciler.ts
- tests/unit/analytics-legacy-recovery-reconciliation.spec.ts

## Validation Failures

- none
