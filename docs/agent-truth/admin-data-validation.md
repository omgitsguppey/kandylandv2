# Admin Data Validation

Data Validation belongs in Admin Debug, not Admin Analytics. Analytics should show product and business insights; it must not render long audit/parity card lists.

Admin Analytics may show only a compact Data Health summary or Debug link. The full validation list, backend wording, source parity, freshness, and action details belong in `/admin/debug?tab=advanced#data-validation`.

Validation status values are `pass`, `warn`, `fail`, `unavailable`, `stale`, and `unknown`.

PASS is allowed only when the required source exists, required samples are present, the validation snapshot is fresh enough for the selected range, and the threshold passes. PASS is forbidden when required data or required samples are missing. Stale validation must not appear as a live pass.

If a check has zero samples and samples are optional, the check must say that plainly. If samples are required and zero landed, the status must be warn, fail, unavailable, stale, or unknown.

GA4 daily export is the stable completed-day source. GA4 intraday/current-day export is incomplete and must be labeled as current-day or intraday when used. Firebase Analytics events can be batched in normal use; DebugView is not production truth. Firestore listener data must expose cache/server metadata when cache transitions matter.

Purchase parity uses completed real-money/internal payment records and canonical commerce rollups first. GA4 or telemetry purchase events are supporting evidence, not the revenue source of truth. Unlock parity uses unlock transactions and canonical unlock rollups first, with telemetry unlock events as supporting evidence.

Module coverage remains warn or fail while indexed modules are empty or partial unless a module is explicitly exempted in code and Debug documents that exemption.

Future agents must not reintroduce the full Data Validation card list into Admin Analytics. Move new validation details into Admin Debug and keep Analytics focused on actionable analytics modules.

## Phase 5 Snapshot Migration

Data Health in Admin Analytics may only be a compact snapshot-backed summary or Debug link. The full validation list belongs in Admin Debug, including source freshness, confidence, PASS blocking reasons, parity failures, legacy recovery, and module coverage. Missing samples, stale validation, and unknown source state must not appear as PASS.
