# Launch Analytics Recovery

Generated: 2026-06-18T10:02:12.957Z
Current head: 845980057b1bf49ec18ef86b526b9632998c0754
Status: source_agreement_failed

## Source Order

- First-party/user activity is primary product truth.
- GA4 is second-source evidence for sessions, views, device mix, regions, top paths, and acquisition-like comparisons.
- Historical snapshots and legacy support can explain gaps, but they do not overwrite first-party user, purchase, unlock, watch, task, creator, admin, wallet, or GumDrop truth.

## Evidence Provenance

- Launch coverage input: agent/state/source-agreement-failure-detail.generated.json
- Launch coverage input mode: fixture_only_local_window
- Usable launch coverage input found: no
- Candidate local/export inputs: agent/evidence/launch-analytics/launch-history-coverage.local.json, agent/evidence/launch-analytics/launch-history-coverage.export.json, agent/evidence/admin-truth-sample/automated-admin-truth-sample.20260603T183719Z.json, agent/evidence/admin-truth-sample/automated-admin-truth-sample.20260603T183719Z.redacted.json
- Panel hydration input: agent/state/analytics-panel-hydration.generated.json
- GA4 read mode: generated/local evidence only; no provider call performed
- First-party read mode: source-agreement day-bucket evidence only; no production read performed
- Limitation: This generated snapshot cannot clear runtime, provider, or admin-truth gates; use the all-range historical route/admin truth sample for formal launch-history proof.

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

- first_party_events: first_party / partial; owner analytics_event_facts and telemetry catalog; coverage 1; boundary: Primary product analytics only after first-party materialization; this generated report is not runtime/admin proof.
- user_person_metrics: person_metrics / validator_passed; owner person metrics hydration; coverage n/a; boundary: Global activity does not clear user/person parity; missing person metrics stay missing until hydrated.
- guest_to_user_handoff: first_party / source_mapped; owner identity handoff and analytics identity link; coverage n/a; boundary: Handoff links journeys but must not double-count guest and signed-in actions.
- event_envelope_translation: first_party / validator_passed; owner event translation bridge and analytics event contract; coverage n/a; boundary: Source translation parity does not prove provider/runtime/admin truth.
- admin_panel_hydration: mixed / partial; owner admin analytics panel hydration; coverage n/a; boundary: Panels may be source-ready without runtime/admin truth evidence.
- historical_snapshots: historicalSnapshot / fallback; owner admin analytics historical snapshot; coverage 1; boundary: Historical snapshots explain gaps but do not overwrite first-party product truth.
- legacy_support_snapshots: legacySupport / fallback; owner legacy recovery/support snapshot lane; coverage 1; boundary: Legacy support remains recovery evidence only and cannot create current product truth.
- ga4_export_api: ga4 / second_source; owner GA4/external analytics truth lane; coverage 3; boundary: GA4 is second-source evidence and cannot replace identity, wallet, entitlement, purchase, or creator revenue truth.
- known_missing_ranges: unknown / source_disagreement; owner launch analytics recovery; coverage n/a; boundary: Missing stays missing; zero is allowed only after a bounded source window proves zero.

## Launch Coverage

- Range: 2026-05-01 to 2026-05-03
- Range proof: union_of_local_source_days
- Coverage window: fixture_only_local_window
- Range proof reason: The source-agreement detail is fixture/local-evidence only, not a formal all-launch proof. Formal all-launch recovery still needs the all-range historical route/admin truth sample or an approved export.
- Recovered days: 3/3
- First recovered day: 2026-05-01
- Last recovered day: 2026-05-03
- Coverage state: partial
- Coverage reason: Launch-history day buckets are only partially first-party backed; GA4, historical snapshots, and legacy support remain evidence-only until first-party product truth covers the range.
- First-party product truth state: partial
- First-party missing ranges: 2026-05-02..2026-05-03
- First-party days: 1
- GA4 days: 3
- Historical snapshot days: 1
- Legacy support days: 1
- Missing ranges: none
- Stale input evidence: no

## Source Agreement

- State: failed
- Compared sources: first_party, ga4, historical_snapshot, legacy_support
- Disagreements: 3
- Max delta: 67
- Classifications: date_range_mismatch, duplicate_event, external_source_gap, missing_materializer
- Per-day disagreement details: 3
  - 2026-05-01: present first_party, ga4, historical_snapshot; missing legacy_support; lane source_overlap_review; owner source agreement overlap review; Multiple evidence lanes overlap; use first-party product truth and keep GA4/fallback as corroboration.
  - 2026-05-02: present ga4; missing first_party, historical_snapshot, legacy_support; lane first_party_materialization; owner analytics_event_facts materialization; GA4 observed the day, but first-party product facts are missing or not materialized.
  - 2026-05-03: present ga4, legacy_support; missing first_party, historical_snapshot; lane first_party_materialization; owner analytics_event_facts materialization; GA4 observed the day, but first-party product facts are missing or not materialized.
- Exact next steps: Run the existing all-range historical analytics route or approved local export path to produce first-party day buckets. | Compare GA4 only as second-source evidence for sessions, views, devices, regions, top paths, and acquisition-style checks. | Keep fallback historical and legacy support rows archive/evidence-only until first-party materialization or dedupe proves the day. | Promote admin charts only after sourceAgreementStatus is pass and first-party product truth covers the bounded window.
- Next action: Refresh or repair the mismatched source lane, inspect first-party day buckets first, keep GA4 as external comparison evidence, classify fallback historical/legacy evidence as archive-only until it agrees, and verify the GA4 property before promoting analytics parity.

## Admin Panel Connection

- Hydrated panels: 10/41
- Source missing: 0
- Materializer missing: 0
- Bridge missing: 0
- Runtime evidence required: 2
- External evidence required: 4

## Next Steps

- Use /api/admin/analytics/historical with range=all to hydrate launchHistoryCoverage from first-party day buckets before chart promotion.
- Compare GA4 day buckets only as second-source evidence; do not average or overwrite first-party product metrics.
- Keep missing days labeled source missing until a bounded source window proves zero.
- Repair source agreement before treating admin charts as canonical launch-history truth.
