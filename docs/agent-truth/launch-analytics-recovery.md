# Launch Analytics Recovery

Generated: 2026-06-20T20:45:02.106Z
Current head: db58df37256ddbe1e3541b38f4f7f906a1f7bf07
Status: source_agreement_failed

## Source Order

- First-party/user activity is primary product truth.
- GA4 is second-source evidence for sessions, views, device mix, regions, top paths, and acquisition-like comparisons.
- Historical snapshots and legacy support can explain gaps, but they do not overwrite first-party user, purchase, unlock, watch, task, creator, admin, wallet, or GumDrop truth.

## Evidence Provenance

- Launch coverage input: in_process_source_agreement_detail
- Launch coverage input mode: fixture_only_local_window
- Usable launch coverage input found: no
- Candidate local/export inputs: agent/evidence/launch-analytics/launch-history-coverage.local.json, agent/evidence/launch-analytics/launch-history-coverage.export.json, agent/evidence/admin-truth-sample/automated-admin-truth-sample.20260603T183719Z.json, agent/evidence/admin-truth-sample/automated-admin-truth-sample.20260603T183719Z.redacted.json
- Candidate input states: agent/evidence/launch-analytics/launch-history-coverage.local.json=missing; agent/evidence/launch-analytics/launch-history-coverage.export.json=missing; agent/evidence/admin-truth-sample/automated-admin-truth-sample.20260603T183719Z.json=present_without_launch_history_coverage; agent/evidence/admin-truth-sample/automated-admin-truth-sample.20260603T183719Z.redacted.json=present_without_launch_history_coverage
- Panel hydration input: agent/state/analytics-panel-hydration.generated.json
- GA4 read mode: generated/local evidence only; no provider call performed
- First-party read mode: source-agreement day-bucket evidence only; no production read performed
- Limitation: This generated snapshot cannot clear runtime, provider, or admin-truth gates; use the all-range historical route/admin truth sample for formal launch-history proof.
- Source gate: blocked - The evidence window is not proven to cover the full launch range; attach an all-range historical export or admin truth sample before clearing source truth.
- Source gate blockers: all_launch_range_proof_missing: The evidence window is not proven to cover the full launch range; attach an all-range historical export or admin truth sample before clearing source truth.; first_party_coverage_incomplete: First-party product truth is incomplete; GA4, historical snapshots, and legacy support cannot clear the source gate.; launch_critical_family_coverage_below_floor: Launch-critical first-party family coverage is 7.7%; source truth needs at least 95% observed first-party coverage before clearing.; source_agreement_failed: Source agreement has not passed; repair the mismatched source lane before clearing source truth.; launch_history_coverage_unavailable: Launch history coverage is not fully available for the bounded evidence window.

## Canonical Owners

- first_party: analytics_event_facts and telemetry catalog
- person_metrics: person metrics hydration
- guestHandoff: identity handoff and analytics identity link
- eventEnvelopeTranslation: event translation bridge and analytics event contract
- ga4: GA4/external evidence lane
- historicalSnapshot: admin analytics historical snapshot
- legacySupport: legacy support snapshot lane
- adminPanelHydration: admin analytics panel hydration

## Source Inventory

- first_party_events: first_party / partial; role primary_product_truth; owner analytics_event_facts and telemetry catalog; coverage 1; boundary: Primary product analytics only after first-party materialization; this generated report is not runtime/admin proof.
- user_person_metrics: person_metrics / validator_passed; role primary_person_truth; owner person metrics hydration; coverage n/a; boundary: Global activity does not clear user/person parity; missing person metrics stay missing until hydrated.
- guest_to_user_handoff: first_party / source_mapped; role journey_linking_truth; owner identity handoff and analytics identity link; coverage n/a; boundary: Handoff links journeys but must not double-count guest and signed-in actions.
- event_envelope_translation: first_party / validator_passed; role normalization_truth; owner event translation bridge and analytics event contract; coverage n/a; boundary: Source translation parity does not prove provider/runtime/admin truth.
- admin_panel_hydration: mixed / partial; role display_readiness_only; owner admin analytics panel hydration; coverage n/a; boundary: Panels may be source-ready without runtime/admin truth evidence.
- historical_snapshots: historicalSnapshot / fallback; role fallback_evidence_only; owner admin analytics historical snapshot; coverage 1; boundary: Historical snapshots explain gaps but do not overwrite first-party product truth.
- legacy_support_snapshots: legacySupport / fallback; role fallback_evidence_only; owner legacy recovery/support snapshot lane; coverage 1; boundary: Legacy support remains recovery evidence only and cannot create current product truth.
- ga4_export_api: ga4 / second_source; role second_source_evidence_only; owner GA4/external analytics truth lane; coverage 3; boundary: GA4 is second-source evidence and cannot replace identity, wallet, entitlement, purchase, or creator revenue truth.
- known_missing_ranges: unknown / source_disagreement; role gap_triage_only; owner launch analytics recovery; coverage n/a; boundary: Missing stays missing; zero is allowed only after a bounded source window proves zero.

## Launch Coverage

- Formal range: 2026-02-12 to 2026-06-20
- Formal range state: formal_proof_missing
- Formal expected days: 129
- Local evidence days: 3
- Approved coverage days: 0
- Formal day rows: 129
- Unproven formal days: 126
- Local evidence ranges: 2026-02-12..2026-02-14
- Unproven formal ranges: 2026-02-12..2026-06-20
- Formal range reason: Current evidence only covers the local source window; approved all-launch export or admin truth sample is still required.
- Range: 2026-02-12 to 2026-02-14
- Range proof: fixture_only_local_window
- Coverage window: fixture_only_local_window
- Range proof reason: The source-agreement detail is fixture/local-evidence only, not a formal all-launch proof. Formal all-launch recovery still needs the all-range historical route/admin truth sample or an approved export.
- Evidence-observed days: 3/3
- Product-truth recovered days: 1/3
- Second-source-only days: 2
- Fallback-only days: 0
- First recovered day: 2026-02-12
- Last recovered day: 2026-02-14
- Coverage state: partial
- Coverage reason: Launch-history day buckets are only partially first-party backed; GA4, historical snapshots, and legacy support remain evidence-only until first-party product truth covers the range.
- First-party product truth state: partial
- First-party missing ranges: 2026-02-13..2026-02-14
- Launch-critical canonical mapping: 100% (13/13 families)
- Launch-critical observed first-party coverage: 7.7% (1/13 families)
- Launch-critical holdback: blocked - Modeled, inferred, cached, or missing evidence cannot clear the 95% first-party recovery calibration floor.
- Active source-code coverage: 100% (13/13 families)
- Active source-code proof clears historical launch rows: no
- Recovered metric metadata: event families complete, active sources complete, local days complete, formal days complete, source-agreement disagreements complete, source-agreement count deltas complete; boundary=metadata_completeness_only_not_source_runtime_provider_or_admin_truth_proof
- Recovery policy: event-id-primary dedupe=on; fallback identity/route/window dedupe=on; GA4/legacy evidence-only=yes; modeled calibration-only=yes; visibility threshold=50%/1000ms; boundary=policy_metadata_only_not_runtime_provider_or_admin_truth_proof
- First-party days: 1
- GA4 days: 3
- Historical snapshot days: 1
- Legacy support days: 1
- All-source missing ranges: none
- Stale input evidence: no

## Formal Launch Day Rows

- 2026-02-12: state=local_evidence_window; evidenceObserved=yes; productTruthRecovered=yes; sourceTruthState=mixed_evidence; sourceCountsKnown=true; first_party=1, ga4=1, historicalSnapshot=1, legacySupport=0; confidence=mixed; confidenceBand=verified; next=Use first-party truth for identity, purchase, unlock, watch, task, creator, and admin metrics; compare GA4 only as second source.
- 2026-02-13: state=local_evidence_window; evidenceObserved=yes; productTruthRecovered=no; sourceTruthState=second_source_only; sourceCountsKnown=true; first_party=0, ga4=1, historicalSnapshot=0, legacySupport=0; confidence=fallback; confidenceBand=directional; next=Recover first-party materialization before promoting this day to canonical product analytics.
- 2026-02-14: state=local_evidence_window; evidenceObserved=yes; productTruthRecovered=no; sourceTruthState=second_source_only; sourceCountsKnown=true; first_party=0, ga4=1, historicalSnapshot=0, legacySupport=1; confidence=fallback; confidenceBand=directional; next=Recover first-party materialization before promoting this day to canonical product analytics.
- 2026-02-15: state=outside_evidence_window; evidenceObserved=no; productTruthRecovered=no; sourceTruthState=source_missing; sourceCountsKnown=false; first_party=unknown, ga4=unknown, historicalSnapshot=unknown, legacySupport=unknown; confidence=unknown; confidenceBand=missing; next=Attach approved all-range historical export or admin truth sample with launchHistoryCoverage rows before promoting this day.
- 2026-02-16: state=outside_evidence_window; evidenceObserved=no; productTruthRecovered=no; sourceTruthState=source_missing; sourceCountsKnown=false; first_party=unknown, ga4=unknown, historicalSnapshot=unknown, legacySupport=unknown; confidence=unknown; confidenceBand=missing; next=Attach approved all-range historical export or admin truth sample with launchHistoryCoverage rows before promoting this day.
- 2026-02-17: state=outside_evidence_window; evidenceObserved=no; productTruthRecovered=no; sourceTruthState=source_missing; sourceCountsKnown=false; first_party=unknown, ga4=unknown, historicalSnapshot=unknown, legacySupport=unknown; confidence=unknown; confidenceBand=missing; next=Attach approved all-range historical export or admin truth sample with launchHistoryCoverage rows before promoting this day.
- 2026-02-18: state=outside_evidence_window; evidenceObserved=no; productTruthRecovered=no; sourceTruthState=source_missing; sourceCountsKnown=false; first_party=unknown, ga4=unknown, historicalSnapshot=unknown, legacySupport=unknown; confidence=unknown; confidenceBand=missing; next=Attach approved all-range historical export or admin truth sample with launchHistoryCoverage rows before promoting this day.
- 2026-02-19: state=outside_evidence_window; evidenceObserved=no; productTruthRecovered=no; sourceTruthState=source_missing; sourceCountsKnown=false; first_party=unknown, ga4=unknown, historicalSnapshot=unknown, legacySupport=unknown; confidence=unknown; confidenceBand=missing; next=Attach approved all-range historical export or admin truth sample with launchHistoryCoverage rows before promoting this day.
- 2026-02-20: state=outside_evidence_window; evidenceObserved=no; productTruthRecovered=no; sourceTruthState=source_missing; sourceCountsKnown=false; first_party=unknown, ga4=unknown, historicalSnapshot=unknown, legacySupport=unknown; confidence=unknown; confidenceBand=missing; next=Attach approved all-range historical export or admin truth sample with launchHistoryCoverage rows before promoting this day.
- 2026-02-21: state=outside_evidence_window; evidenceObserved=no; productTruthRecovered=no; sourceTruthState=source_missing; sourceCountsKnown=false; first_party=unknown, ga4=unknown, historicalSnapshot=unknown, legacySupport=unknown; confidence=unknown; confidenceBand=missing; next=Attach approved all-range historical export or admin truth sample with launchHistoryCoverage rows before promoting this day.
- 2026-02-22: state=outside_evidence_window; evidenceObserved=no; productTruthRecovered=no; sourceTruthState=source_missing; sourceCountsKnown=false; first_party=unknown, ga4=unknown, historicalSnapshot=unknown, legacySupport=unknown; confidence=unknown; confidenceBand=missing; next=Attach approved all-range historical export or admin truth sample with launchHistoryCoverage rows before promoting this day.
- 2026-02-23: state=outside_evidence_window; evidenceObserved=no; productTruthRecovered=no; sourceTruthState=source_missing; sourceCountsKnown=false; first_party=unknown, ga4=unknown, historicalSnapshot=unknown, legacySupport=unknown; confidence=unknown; confidenceBand=missing; next=Attach approved all-range historical export or admin truth sample with launchHistoryCoverage rows before promoting this day.
- 2026-02-24: state=outside_evidence_window; evidenceObserved=no; productTruthRecovered=no; sourceTruthState=source_missing; sourceCountsKnown=false; first_party=unknown, ga4=unknown, historicalSnapshot=unknown, legacySupport=unknown; confidence=unknown; confidenceBand=missing; next=Attach approved all-range historical export or admin truth sample with launchHistoryCoverage rows before promoting this day.
- 2026-02-25: state=outside_evidence_window; evidenceObserved=no; productTruthRecovered=no; sourceTruthState=source_missing; sourceCountsKnown=false; first_party=unknown, ga4=unknown, historicalSnapshot=unknown, legacySupport=unknown; confidence=unknown; confidenceBand=missing; next=Attach approved all-range historical export or admin truth sample with launchHistoryCoverage rows before promoting this day.
- 115 additional formal launch days omitted from compact doc; see agent/state/launch-analytics-recovery.generated.json.

## Daily Recovery Rows

- 2026-02-12: evidenceObserved=yes; productTruthRecovered=yes; sourceTruthState=mixed_evidence; sourceCounts first_party=1, ga4=1, historicalSnapshot=1, legacySupport=0; missing=legacySupport:2026-02-12; duplicateRanges=2026-02-12; internalAdminExcluded=unknown; confidence=mixed; confidenceBand=verified; next=Use first-party truth for identity, purchase, unlock, watch, task, creator, and admin metrics; compare GA4 only as second source.
- 2026-02-13: evidenceObserved=yes; productTruthRecovered=no; sourceTruthState=second_source_only; sourceCounts first_party=0, ga4=1, historicalSnapshot=0, legacySupport=0; missing=first_party:2026-02-13 | historicalSnapshot:2026-02-13 | legacySupport:2026-02-13; duplicateRanges=none; internalAdminExcluded=unknown; confidence=fallback; confidenceBand=directional; next=Recover first-party materialization before promoting this day to canonical product analytics.
- 2026-02-14: evidenceObserved=yes; productTruthRecovered=no; sourceTruthState=second_source_only; sourceCounts first_party=0, ga4=1, historicalSnapshot=0, legacySupport=1; missing=first_party:2026-02-14 | historicalSnapshot:2026-02-14; duplicateRanges=2026-02-14; internalAdminExcluded=unknown; confidence=fallback; confidenceBand=directional; next=Recover first-party materialization before promoting this day to canonical product analytics.


## Source Agreement

- State: failed
- Compared sources: first_party, ga4, historical_snapshot, legacy_support
- Disagreements: 2
- Max delta: 67
- Classifications: date_range_mismatch, external_source_gap, missing_materializer
- Per-day disagreement details: 2
  - 2026-02-13: present ga4; missing first_party, historical_snapshot, legacy_support; lane first_party_materialization; owner analytics_event_facts materialization; GA4 observed the day, but first-party product facts are missing or not materialized.
  - 2026-02-14: present ga4, legacy_support; missing first_party, historical_snapshot; lane first_party_materialization; owner analytics_event_facts materialization; GA4 observed the day, but first-party product facts are missing or not materialized.
- Blocked consumers: 9
  - Analytics overview: source_missing; Next: Show source missing or keep charts waiting for proof until first-party day buckets and source agreement pass.
  - Analytics charts: source_missing; Next: Show source missing or keep charts waiting for proof until first-party day buckets and source agreement pass.
  - Device mix: second_source_only; Next: Show GA4 as second-source evidence only; keep this panel waiting for first-party source agreement before treating it as product truth.
  - Region demand: second_source_only; Next: Show GA4 as second-source evidence only; keep this panel waiting for first-party source agreement before treating it as product truth.
  - Top paths: second_source_only; Next: Show GA4 as second-source evidence only; keep this panel waiting for first-party source agreement before treating it as product truth.
  - Insight cards: source_missing; Next: Show source missing or keep charts waiting for proof until first-party day buckets and source agreement pass.
  - Source health: chart_promotion_blocked; Next: Show source missing or keep charts waiting for proof until first-party day buckets and source agreement pass.
  - Debug source agreement: chart_promotion_blocked; Next: Show source missing or keep charts waiting for proof until first-party day buckets and source agreement pass.
  - Public beta evidence: chart_promotion_blocked; Next: Show source missing or keep charts waiting for proof until first-party day buckets and source agreement pass.
- Count delta details: 0
- Exact next steps: Run the existing all-range historical analytics route or approved local export path to produce first-party day buckets. | Compare GA4 only as second-source evidence for sessions, views, devices, regions, top paths, and acquisition-style checks. | Keep fallback historical and legacy support rows archive/evidence-only until first-party materialization or dedupe proves the day. | Promote admin charts only after sourceAgreementStatus is pass and first-party product truth covers the bounded window.
- Next action: Refresh or repair the mismatched source lane, inspect first-party day buckets first, keep GA4 as external comparison evidence, classify fallback historical/legacy evidence as archive-only until it agrees, and verify the GA4 property before promoting analytics parity.

## Legacy Recovery Queue

- Role: recovery_evidence_only
- Production mutation allowed: no
- Current totals eligible: 0
- Product-truth eligible: 0
- Overwrites current truth: no
- Legacy sources inventoried: 17
- Backfillable sources: 9
- Directional sources: 6
- Debug-only sources: 2
- Purgatory rows: 10
- Weak matches: 7
- Unknown legacy rows: 3
- Manual review required: 10
- Stale legacy report inputs: none
- Historical evidence-only inputs: none
- Boundary: Legacy, historical snapshot, and GA4 evidence can explain gaps or seed manual review only. They cannot overwrite analytics_event_facts, wallet, GumDrop, unlock, purchase, creator revenue, or person metric truth.
  - analytics_event_facts/fixture_evt_drop_click: weak_match; confidence=weak_match; currentTotalsEligible=no; action=manual_review_identity_bridge
  - analytics_guest_batches/fixture_guest_batch: weak_match; confidence=weak_match; currentTotalsEligible=no; action=manual_review_identity_bridge
  - transactions/fixture_txn_completed: weak_match; confidence=weak_match; currentTotalsEligible=no; action=manual_review_identity_bridge
  - unlocks/fixture_unlock: weak_match; confidence=weak_match; currentTotalsEligible=no; action=manual_review_identity_bridge
  - daily_task_events/fixture_task_complete: weak_match; confidence=weak_match; currentTotalsEligible=no; action=manual_review_identity_bridge
  - task_lifecycle_logs/fixture_task_start: weak_match; confidence=weak_match; currentTotalsEligible=no; action=manual_review_identity_bridge
  - notifications/fixture_notification_read: unknown; confidence=unknown; currentTotalsEligible=no; action=archive_as_debug_evidence
  - onboarding_steps/fixture_onboarding_step: weak_match; confidence=weak_match; currentTotalsEligible=no; action=manual_review_identity_bridge
  - 2 additional legacy rows omitted from compact doc; see agent/state/launch-analytics-recovery.generated.json.
- Legacy next steps: Refresh the legacy history reconciliation artifacts when legacy mapping files change. | Review weak/unknown purgatory rows with identity bridge evidence before any dry-run import candidate is promoted. | Keep currentTotalsEligibleCount and productTruthEligibleCount at 0 until strict first-party corroboration exists.

## Admin Panel Connection

- Hydrated panels: 10/41
- Source missing: 0
- Materializer missing: 0
- Bridge missing: 0
- Runtime evidence required: 2
- External evidence required: 4
- Source-agreement blocked consumers: 9
- Source-agreement source missing: 3
- Source-agreement second-source only: 3
- Source-agreement charts waiting for proof: 3
- Source-agreement consumer mismatch: 0

## Next Steps

- Use /api/admin/analytics/historical with range=all to hydrate launchHistoryCoverage from first-party day buckets before charts can be treated as canonical.
- Compare GA4 day buckets only as second-source evidence; do not average or overwrite first-party product metrics.
- Keep missing days labeled source missing until a bounded source window proves zero.
- Repair source agreement before treating admin charts as canonical launch-history truth.
